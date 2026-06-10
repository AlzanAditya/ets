/**
 * image-service.ts
 *
 * Generic image storage service for the private 'product-images' bucket.
 *
 * Responsibilities:
 * - Upload optimized full + thumbnail files to correct storage paths.
 * - Manage the full upload lifecycle: temp session → draft → product.
 * - Clean up orphaned temp/draft files when drawers are closed or drafts deleted.
 * - Retrieve signed URLs in batches with in-memory caching to avoid per-image
 *   round-trips in large galleries.
 *
 * Storage path structure:
 *   uploads/temp/{sessionId}/full/{uuid}.webp    ← pre-draft session files
 *   uploads/temp/{sessionId}/thumbs/{uuid}.webp
 *   drafts/{draftId}/full/{uuid}.webp            ← saved draft files
 *   drafts/{draftId}/thumbs/{uuid}.webp
 *   products/{productId}/full/{uuid}.webp        ← committed product files
 *   products/{productId}/thumbs/{uuid}.webp
 *
 * Design constraints:
 * - No Base64 — only File objects and storage paths are used.
 * - All bucket access uses the private 'product-images' bucket.
 * - Signed URLs are cached in memory and refreshed only when expired.
 * - All helpers are bucket-agnostic and reusable for future modules
 *   (maintenance images, report images, etc.) by passing a different bucket name.
 */

import { supabase } from '@/lib/supabase'
import { safeUUID } from '@/lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

export const IMAGE_BUCKET = 'product-images'
/** Signed URL expiry in seconds (1 hour). URLs are cached for this duration. */
const SIGNED_URL_TTL_SECONDS = 3600

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UploadedImagePaths {
  fullPath: string
  thumbPath: string
}

// ─── Signed URL Cache ─────────────────────────────────────────────────────────
// Map<storagePath, { url: string; expiresAt: number }>

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>()

function getCachedUrl(path: string): string | null {
  const entry = signedUrlCache.get(path)
  if (!entry) return null
  if (Date.now() > entry.expiresAt - 60_000) {
    // Expired or expiring within 60 seconds — evict
    signedUrlCache.delete(path)
    return null
  }
  return entry.url
}

function setCachedUrl(path: string, url: string): void {
  signedUrlCache.set(path, {
    url,
    expiresAt: Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
  })
}

// ─── Upload ───────────────────────────────────────────────────────────────────

/**
 * Generate a unique UUID using the browser's crypto API.
 */
function generateId(): string {
  return safeUUID()
}

/**
 * Upload a single File to the specified storage path.
 * @param file - File object to upload (must already be optimized WebP).
 * @param path - Full storage path (e.g. 'uploads/temp/{id}/full/abc.webp').
 * @param bucket - Bucket name (default: IMAGE_BUCKET).
 * @returns The storage path on success.
 */
export async function uploadFile(
  file: File,
  path: string,
  bucket = IMAGE_BUCKET,
): Promise<string> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    })

  if (error) throw new Error(`Storage upload failed (${path}): ${error.message}`)
  return path
}

/**
 * Upload a full + thumbnail WebP pair to a given namespace prefix.
 *
 * @param full  - Full-resolution WebP File.
 * @param thumb - Thumbnail WebP File.
 * @param prefix - Storage path prefix (e.g. 'uploads/temp/{sessionId}').
 * @returns { fullPath, thumbPath } — stable storage references.
 */
export async function uploadImagePair(
  full: File,
  thumb: File,
  prefix: string,
  bucket = IMAGE_BUCKET,
): Promise<UploadedImagePaths> {
  const id        = generateId()
  const fullPath  = `${prefix}/full/${id}.webp`
  const thumbPath = `${prefix}/thumbs/${id}_thumb.webp`

  await Promise.all([
    uploadFile(full,  fullPath,  bucket),
    uploadFile(thumb, thumbPath, bucket),
  ])

  return { fullPath, thumbPath }
}

// ─── Signed URL retrieval (batched + cached) ──────────────────────────────────

/**
 * Resolve multiple storage paths to signed URLs in a single batch request.
 * Results are cached in memory for the signed URL TTL duration.
 *
 * @param paths  - Array of storage paths to resolve.
 * @param bucket - Bucket name.
 * @returns A Record mapping each path → signed URL.
 */
export async function getSignedUrls(
  paths: string[],
  bucket = IMAGE_BUCKET,
): Promise<Record<string, string>> {
  if (paths.length === 0) return {}

  const result: Record<string, string> = {}
  const uncached: string[] = []

  // Serve from cache where possible
  for (const path of paths) {
    const cached = getCachedUrl(path)
    if (cached) {
      result[path] = cached
    } else {
      uncached.push(path)
    }
  }

  if (uncached.length === 0) return result

  // Batch resolve uncached paths
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(uncached, SIGNED_URL_TTL_SECONDS)

  if (error) throw new Error(`Signed URL batch request failed: ${error.message}`)

  for (const item of data ?? []) {
    if (item.signedUrl && item.path) {
      setCachedUrl(item.path, item.signedUrl)
      result[item.path] = item.signedUrl
    }
  }

  return result
}

/**
 * Resolve a single storage path to a signed URL (cache-aware).
 */
export async function getSignedUrl(path: string, bucket = IMAGE_BUCKET): Promise<string> {
  const cached = getCachedUrl(path)
  if (cached) return cached

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

  if (error || !data?.signedUrl) {
    throw new Error(`Signed URL failed for ${path}: ${error?.message ?? 'unknown error'}`)
  }

  setCachedUrl(path, data.signedUrl)
  return data.signedUrl
}

// ─── File Operations ──────────────────────────────────────────────────────────

/**
 * Copy a file from one storage path to another within the same bucket.
 * Supabase Storage does not have a native move — we copy then delete.
 */
export async function copyFile(
  from: string,
  to: string,
  bucket = IMAGE_BUCKET,
): Promise<void> {
  const { error } = await supabase.storage.from(bucket).copy(from, to)
  if (error) throw new Error(`Storage copy failed (${from} → ${to}): ${error.message}`)
}

/**
 * Delete a single file from storage.
 */
export async function deleteFile(path: string, bucket = IMAGE_BUCKET): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw new Error(`Storage delete failed (${path}): ${error.message}`)
  signedUrlCache.delete(path)
}

/**
 * Delete multiple files from storage in a single request.
 */
export async function deleteFiles(paths: string[], bucket = IMAGE_BUCKET): Promise<void> {
  if (paths.length === 0) return
  const { error } = await supabase.storage.from(bucket).remove(paths)
  if (error) throw new Error(`Storage batch delete failed: ${error.message}`)
  paths.forEach((p) => signedUrlCache.delete(p))
}

/**
 * List all files under a storage prefix and delete them.
 * Used for temp session cleanup and draft deletion.
 *
 * @param prefix - Storage path prefix, e.g. 'uploads/temp/{sessionId}'.
 */
export async function deleteDirectory(prefix: string, bucket = IMAGE_BUCKET): Promise<void> {
  // List files in each known sub-folder
  const folders = ['full', 'thumbs']
  const allPaths: string[] = []

  for (const folder of folders) {
    const folderPath = `${prefix}/${folder}`
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folderPath)

    if (error) {
      // Non-existent folders are not errors — skip silently
      continue
    }

    for (const file of data ?? []) {
      allPaths.push(`${folderPath}/${file.name}`)
    }
  }

  if (allPaths.length > 0) {
    await deleteFiles(allPaths, bucket)
  }
}

// ─── Lifecycle: Temp Session → Draft ─────────────────────────────────────────

/**
 * Move all files from a temp session namespace to a draft namespace.
 * Called when the user clicks "Save as Draft".
 *
 * @param sessionId - Temp session ID.
 * @param draftId   - Draft ID to move files to.
 * @param pairs     - Array of { fullPath, thumbPath } to relocate.
 * @returns Updated { fullPath, thumbPath } pairs under the draft namespace.
 */
export async function moveTempToDraft(
  _sessionId: string,
  draftId: string,
  pairs: UploadedImagePaths[],
): Promise<UploadedImagePaths[]> {
  const updated: UploadedImagePaths[] = []

  await Promise.all(
    pairs.map(async ({ fullPath, thumbPath }) => {
      const fileName      = fullPath.split('/').pop()!
      const thumbFileName = thumbPath.split('/').pop()!

      const newFull  = `drafts/${draftId}/full/${fileName}`
      const newThumb = `drafts/${draftId}/thumbs/${thumbFileName}`

      await Promise.all([
        copyFile(fullPath,  newFull),
        copyFile(thumbPath, newThumb),
        // Delete originals after successful copy
      ])

      await deleteFiles([fullPath, thumbPath])

      updated.push({ fullPath: newFull, thumbPath: newThumb })
    })
  )

  return updated
}

// ─── Lifecycle: Draft → Product ───────────────────────────────────────────────

/**
 * Move all files from a draft namespace to the final product namespace.
 * Called when the user clicks "Submit" and the product has been created.
 *
 * @param draftId   - Draft ID where files currently live.
 * @param productId - Product ID to move files to.
 * @param pairs     - Array of { fullPath, thumbPath } to relocate.
 * @returns Updated { fullPath, thumbPath } pairs under the product namespace.
 */
export async function moveDraftToProduct(
  _draftId: string,
  productId: string,
  pairs: UploadedImagePaths[],
): Promise<UploadedImagePaths[]> {
  const updated: UploadedImagePaths[] = []

  await Promise.all(
    pairs.map(async ({ fullPath, thumbPath }) => {
      const fileName      = fullPath.split('/').pop()!
      const thumbFileName = thumbPath.split('/').pop()!

      const newFull  = `products/${productId}/full/${fileName}`
      const newThumb = `products/${productId}/thumbs/${thumbFileName}`

      await Promise.all([
        copyFile(fullPath,  newFull),
        copyFile(thumbPath, newThumb),
      ])

      await deleteFiles([fullPath, thumbPath])

      updated.push({ fullPath: newFull, thumbPath: newThumb })
    })
  )

  return updated
}

/**
 * Clean up a temp session's storage files.
 * Called when the drawer is closed without saving.
 */
export async function cleanupTempSession(sessionId: string, bucket = IMAGE_BUCKET): Promise<void> {
  await deleteDirectory(`uploads/temp/${sessionId}`, bucket)
}

/**
 * Clean up a draft's storage files.
 * Called when a draft is manually deleted.
 */
export async function cleanupDraft(draftId: string, bucket = IMAGE_BUCKET): Promise<void> {
  await deleteDirectory(`drafts/${draftId}`, bucket)
}
