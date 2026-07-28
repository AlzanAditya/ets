/**
 * image-optimizer.ts
 *
 * Client-side image optimization pipeline.
 * Resizes, compresses, and converts images to WebP using the HTML5 Canvas API.
 * Returns both a full-resolution and a thumbnail file, along with extracted
 * image dimensions.
 *
 * Design:
 * - No Base64 storage — returns File objects and object URLs only.
 * - Works in any browser that supports Canvas + toBlob (all modern browsers).
 * - Generic and reusable for products, maintenance docs, reports, etc.
 */

export interface OptimizedImage {
  /** Optimized full-resolution WebP File (max 1600px longest side, ~75% quality) */
  full: File
  /** Thumbnail WebP File (max 400px longest side, ~80% quality) */
  thumb: File
  /** Original width of the image in pixels (after resizing full) */
  width: number
  /** Original height of the image in pixels (after resizing full) */
  height: number
  /** Browser object URL for the full image — use for previews. Revoke after use. */
  previewUrl: string
}

const FULL_MAX_PX   = 1600
const THUMB_MAX_PX  = 400
const FULL_QUALITY  = 0.78   // 75–80%
const THUMB_QUALITY = 0.80
const OUTPUT_TYPE   = 'image/webp'

/**
 * Load a File into an HTMLImageElement.
 * Uses a temporary object URL, revoked immediately after load.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Failed to load image: ${file.name}`)) }
    img.src = url
  })
}

/**
 * Resize img onto a canvas keeping aspect ratio, then export as a WebP Blob.
 */
function resizeToBlob(
  img: HTMLImageElement,
  maxPx: number,
  quality: number,
): Promise<{ blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const { naturalWidth: sw, naturalHeight: sh } = img
    const ratio  = Math.min(1, maxPx / Math.max(sw, sh))
    const width  = Math.round(sw * ratio)
    const height = Math.round(sh * ratio)

    const canvas = document.createElement('canvas')
    canvas.width  = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('Canvas 2D context not available'))
      return
    }

    ctx.drawImage(img, 0, 0, width, height)
    canvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error('Canvas toBlob() returned null')); return }
        resolve({ blob, width, height })
      },
      OUTPUT_TYPE,
      quality,
    )
  })
}

/**
 * Main export: optimizes a single File into full + thumbnail WebP files.
 *
 * @param file - Raw image file from <input type="file"> or drag-and-drop.
 * @returns OptimizedImage with File objects, dimensions, and a preview URL.
 *
 * @example
 * const optimized = await optimizeImage(inputFile)
 * // Upload optimized.full and optimized.thumb to storage
 * // Display optimized.previewUrl in <img src={...} />
 * // When no longer needed: URL.revokeObjectURL(optimized.previewUrl)
 */
export async function optimizeImage(file: File): Promise<OptimizedImage> {
  const img = await loadImage(file)

  const [fullResult, thumbResult] = await Promise.all([
    resizeToBlob(img, FULL_MAX_PX, FULL_QUALITY),
    resizeToBlob(img, THUMB_MAX_PX, THUMB_QUALITY),
  ])

  const baseName   = file.name.replace(/\.[^.]+$/, '')
  const fullFile   = new File([fullResult.blob],  `${baseName}.webp`,  { type: OUTPUT_TYPE })
  const thumbFile  = new File([thumbResult.blob], `${baseName}_thumb.webp`, { type: OUTPUT_TYPE })
  const previewUrl = URL.createObjectURL(fullResult.blob)

  return {
    full:  fullFile,
    thumb: thumbFile,
    width:  fullResult.width,
    height: fullResult.height,
    previewUrl,
  }
}

/**
 * Resize and center crop an image into a 300x300 WebP square File for client avatars.
 */
export async function optimizeAvatarImage(file: File, targetSize = 300): Promise<{ file: File; previewUrl: string }> {
  const img = await loadImage(file)
  const canvas = document.createElement('canvas')
  canvas.width = targetSize
  canvas.height = targetSize

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context not available')

  // Center-crop (cover) fit
  const sw = img.naturalWidth
  const sh = img.naturalHeight
  const aspect = sw / sh

  let sx = 0, sy = 0, sWidth = sw, sHeight = sh
  if (aspect > 1) {
    // Landscape
    sWidth = sh
    sx = (sw - sh) / 2
  } else {
    // Portrait
    sHeight = sw
    sy = (sh - sw) / 2
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetSize, targetSize)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) reject(new Error('Failed to generate avatar blob'))
        else resolve(b)
      },
      OUTPUT_TYPE,
      0.85
    )
  })

  const avatarFile = new File([blob], 'profile.webp', { type: OUTPUT_TYPE })
  const previewUrl = URL.createObjectURL(blob)

  return { file: avatarFile, previewUrl }
}

