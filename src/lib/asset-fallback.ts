/**
 * asset-fallback.ts
 *
 * Centralized utility for static asset resolution with Local-First -> CDN Fallback.
 * Base CDN URL: https://cdn.zanxa.studio/ets-public/
 */

export const CDN_BASE_URL = "https://cdn.zanxa.studio/ets-public/"

// Cache set of clean relative paths that failed locally in the current session
const failedLocalAssets = new Set<string>()

// Cache set of clean relative paths that succeeded locally
const succeededLocalAssets = new Set<string>()

// Cache set of clean relative paths where CDN also failed
const failedCdnAssets = new Set<string>()

/**
 * Clean and normalize any static asset path into a standard relative path.
 *
 * Examples:
 * - "/public/report-assets/s01-p02.png" => "report-assets/s01-p02.png"
 * - "~/public/report-assets/s01-p02.png" => "report-assets/s01-p02.png"
 * - "public/report-assets/s01-p02.png"  => "report-assets/s01-p02.png"
 * - "/report-assets/s01-p02.png"        => "report-assets/s01-p02.png"
 * - "report-assets/s01-p02.png"         => "report-assets/s01-p02.png"
 */
export function cleanAssetPath(rawPath: string): string {
  if (!rawPath) return ""
  let path = rawPath.trim()

  // If data URI or blob URI, return as is
  if (path.startsWith("data:") || path.startsWith("blob:")) {
    return path
  }

  // If full HTTP/HTTPS URL, check if it's already a local or CDN URL
  if (/^https?:\/\//i.test(path)) {
    if (path.startsWith(CDN_BASE_URL)) {
      return path.slice(CDN_BASE_URL.length)
    }
    // External URL (e.g. Supabase, QR Server, etc.)
    return path
  }

  // Remove leading ~ or .
  path = path.replace(/^[~.]+\//, "")

  // Remove leading /
  if (path.startsWith("/")) {
    path = path.slice(1)
  }

  // Remove "public/" prefix if present
  if (path.startsWith("public/")) {
    path = path.slice(7)
  }

  return path
}

/**
 * Check if path is full external URL or data/blob URI
 */
export function isExternalOrDataUrl(path: string): boolean {
  if (!path) return false
  if (/^(?:data:|blob:)/i.test(path)) return true
  if (/^https?:\/\//i.test(path)) {
    // CDN base URL is managed by our fallback logic
    if (path.startsWith(CDN_BASE_URL)) return false
    return true
  }
  return false
}

/**
 * Get the local URL for a given static asset.
 */
export function getLocalAssetUrl(rawPath: string): string {
  if (!rawPath) return ""
  if (isExternalOrDataUrl(rawPath)) return rawPath
  const clean = cleanAssetPath(rawPath)
  return `/${clean}`
}

/**
 * Get the fallback CDN URL for a given static asset.
 */
export function getCdnAssetUrl(rawPath: string): string {
  if (!rawPath) return ""
  if (isExternalOrDataUrl(rawPath)) return rawPath
  const clean = cleanAssetPath(rawPath)
  return `${CDN_BASE_URL}${clean}`
}

/**
 * Returns the best URL for a static asset.
 * If the local asset is already known to have failed, returns the CDN URL directly.
 */
export function getAssetUrl(rawPath: string): string {
  if (!rawPath) return ""
  if (isExternalOrDataUrl(rawPath)) return rawPath

  const clean = cleanAssetPath(rawPath)
  if (failedLocalAssets.has(clean)) {
    return getCdnAssetUrl(clean)
  }

  return getLocalAssetUrl(clean)
}

/**
 * Mark a local asset as failed so subsequent calls use CDN immediately.
 */
export function markLocalAssetFailed(rawPath: string): void {
  if (!rawPath || isExternalOrDataUrl(rawPath)) return
  const clean = cleanAssetPath(rawPath)
  failedLocalAssets.add(clean)
}

/**
 * Mark a CDN asset as failed.
 */
export function markCdnAssetFailed(rawPath: string): void {
  if (!rawPath || isExternalOrDataUrl(rawPath)) return
  const clean = cleanAssetPath(rawPath)
  failedCdnAssets.add(clean)
}

/**
 * Asynchronously probe an asset and resolve to the working URL (Local first -> CDN fallback).
 * Caches the result so subsequent checks are instant.
 */
export async function resolveAssetUrl(rawPath: string): Promise<string> {
  if (!rawPath) return ""
  if (isExternalOrDataUrl(rawPath)) return rawPath

  const clean = cleanAssetPath(rawPath)
  const localUrl = getLocalAssetUrl(clean)
  const cdnUrl = getCdnAssetUrl(clean)

  if (succeededLocalAssets.has(clean)) return localUrl
  if (failedLocalAssets.has(clean)) return cdnUrl

  try {
    const exists = await checkImageExists(localUrl)
    if (exists) {
      succeededLocalAssets.add(clean)
      return localUrl
    }
  } catch {
    // Ignore error
  }

  failedLocalAssets.add(clean)
  return cdnUrl
}

function checkImageExists(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = url
  })
}
