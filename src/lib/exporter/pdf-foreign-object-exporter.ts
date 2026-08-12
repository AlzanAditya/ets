import { jsPDF } from 'jspdf'
import { ExportPdfOptions } from './types'

const DEFAULT_SCALE = 1.5
const ASSET_TIMEOUT_MS = 8000

function convertOklchColor(str: string): string {
  if (!str || typeof str !== 'string' || !str.includes('oklch')) return str
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = str
      return ctx.fillStyle
    }
  } catch {
    // fall through
  }
  return '#000000'
}

function sanitizeCss(css: string): string {
  return css.replace(/oklch\([^)]*\)/gi, (match) => convertOklchColor(match) || '#000000')
}

function cssUrlToAbsolute(url: string, baseUrl: string): string | null {
  const trimmed = url.trim().replace(/^['"]|['"]$/g, '')
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed || null
  try {
    return new URL(trimmed, baseUrl).href
  } catch {
    return null
  }
}

async function fetchText(url: string, timeoutMs = ASSET_TIMEOUT_MS): Promise<string | null> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit', signal: controller.signal })
    if (!response.ok) return null
    return await response.text()
  } catch {
    return null
  } finally {
    window.clearTimeout(timer)
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error || new Error('Failed to read blob'))
    reader.readAsDataURL(blob)
  })
}

async function fetchAsDataUrl(url: string, timeoutMs = ASSET_TIMEOUT_MS): Promise<string | null> {
  if (!url || url.startsWith('data:')) return url || null
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit', signal: controller.signal })
    if (!response.ok) return null
    return await blobToDataUrl(await response.blob())
  } catch {
    return null
  } finally {
    window.clearTimeout(timer)
  }
}

function extractCssUrls(css: string): string[] {
  return Array.from(css.matchAll(/url\(\s*(['"]?)([^'"\)]+)\1\s*\)/gi))
    .map((match) => match[2])
    .filter(Boolean)
}

async function inlineFontFaces(css: string, baseUrl: string): Promise<string> {
  const fontFaceBlocks = Array.from(css.matchAll(/@font-face\s*\{([\s\S]*?)\}/gi)).map((match) => match[0])
  if (!fontFaceBlocks.length) return css

  const replacements = new Map<string, string>()
  for (const block of fontFaceBlocks) {
    for (const rawUrl of extractCssUrls(block)) {
      const absoluteUrl = cssUrlToAbsolute(rawUrl, baseUrl)
      if (!absoluteUrl || absoluteUrl.startsWith('data:')) continue
      const dataUrl = await fetchAsDataUrl(absoluteUrl)
      if (dataUrl) replacements.set(rawUrl, dataUrl)
    }
  }

  let result = css
  for (const [rawUrl, dataUrl] of replacements) {
    result = result.split(`url('${rawUrl}')`).join(`url('${dataUrl}')`)
    result = result.split(`url("${rawUrl}")`).join(`url("${dataUrl}")`)
    result = result.split(`url(${rawUrl})`).join(`url(${dataUrl})`)
  }
  return result
}

async function inlineBackgroundImages(source: HTMLElement, clone: HTMLElement): Promise<void> {
  const sourceElements = [source, ...Array.from(source.querySelectorAll<HTMLElement>('*'))]
  const cloneElements = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))]
  const count = Math.min(sourceElements.length, cloneElements.length)

  await Promise.all(Array.from({ length: count }, async (_, index) => {
    const original = sourceElements[index]
    const target = cloneElements[index]
    const backgroundImage = window.getComputedStyle(original).backgroundImage
    if (!backgroundImage || backgroundImage === 'none' || !backgroundImage.includes('url(')) return

    const urls = extractCssUrls(backgroundImage)
    let resolved = backgroundImage
    for (const rawUrl of urls) {
      const absoluteUrl = cssUrlToAbsolute(rawUrl, document.baseURI)
      if (!absoluteUrl || absoluteUrl.startsWith('data:')) continue
      const dataUrl = await fetchAsDataUrl(absoluteUrl)
      if (!dataUrl) throw new Error(`Background asset tidak dapat disematkan: ${absoluteUrl}`)
      resolved = resolved.split(`url('${rawUrl}')`).join(`url('${dataUrl}')`)
      resolved = resolved.split(`url("${rawUrl}")`).join(`url("${dataUrl}")`)
      resolved = resolved.split(`url(${rawUrl})`).join(`url(${dataUrl})`)
    }
    target.style.backgroundImage = resolved
  }))
}
/**
 * Collect styles and inline imported stylesheets/fonts so the SVG image context
 * never has to request external CSS or font resources. SVG used as an image is
 * intentionally isolated from external resources by browsers.
 */
async function collectStyles(): Promise<string> {
  const chunks: string[] = []
  const importUrls = new Set<string>()

  document.querySelectorAll('style').forEach((style) => {
    if (!style.textContent) return
    const text = style.textContent
    chunks.push(text)
    for (const match of text.matchAll(/@import\s+(?:url\(\s*['"]?([^'"\)]+)['"]?\s*\)|['"]([^'"]+)['"])[^;]*;/gi)) {
      const raw = match[1] || match[2]
      const absolute = raw ? cssUrlToAbsolute(raw, document.baseURI) : null
      if (absolute) importUrls.add(absolute)
    }
  })

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = Array.from(sheet.cssRules || [])
      if (rules.length) {
        chunks.push(rules.map((rule) => rule.cssText).join('\n'))
      }
    } catch {
      // Cross-origin sheets are handled below through their @import URL when possible.
    }
  }

  for (const link of Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'))) {
    const href = link.href
    if (href && new URL(href, document.baseURI).origin !== window.location.origin) {
      importUrls.add(href)
    }
  }

  for (const url of importUrls) {
    const css = await fetchText(url)
    if (css) chunks.push(css)
  }

  // SVG-as-image contexts cannot rely on external resources. Inline every font
  // source that can be fetched with CORS, including fonts referenced by Google Fonts.
  let combined = sanitizeCss(chunks.join('\n'))
  combined = combined.replace(/@import\s+(?:url\([^)]*\)|['"][^'"]+['"])[^;]*;/gi, '')
  combined = await inlineFontFaces(combined, document.baseURI)
  return combined
}

async function waitForImage(img: HTMLImageElement, timeoutMs = ASSET_TIMEOUT_MS): Promise<boolean> {
  if (img.complete) return img.naturalWidth > 0 || img.naturalHeight > 0

  return new Promise<boolean>((resolve) => {
    let settled = false
    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      img.removeEventListener('load', onLoad)
      img.removeEventListener('error', onError)
      resolve(ok)
    }
    const onLoad = () => finish(img.naturalWidth > 0 || img.naturalHeight > 0)
    const onError = () => finish(false)
    const timer = window.setTimeout(() => finish(false), timeoutMs)
    img.addEventListener('load', onLoad, { once: true })
    img.addEventListener('error', onError, { once: true })
  })
}

async function imageToDataUrl(img: HTMLImageElement): Promise<string | null> {
  const src = img.currentSrc || img.src
  if (!src) return null
  if (src.startsWith('data:')) return src
  return fetchAsDataUrl(src)
}

function inlineComputedStyles(source: HTMLElement, clone: HTMLElement): void {
  const sourceElements = [source, ...Array.from(source.querySelectorAll<HTMLElement>('*'))]
  const cloneElements = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))]
  const count = Math.min(sourceElements.length, cloneElements.length)

  for (let i = 0; i < count; i += 1) {
    const computed = window.getComputedStyle(sourceElements[i])
    const target = cloneElements[i]
    const importantProperties = [
      'box-sizing', 'display', 'position', 'top', 'right', 'bottom', 'left',
      'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
      'margin', 'padding', 'border', 'border-radius', 'border-width', 'border-style',
      'border-color', 'background', 'background-color', 'background-image',
      'background-size', 'background-position', 'background-repeat', 'color',
      'font', 'font-family', 'font-size', 'font-weight', 'font-style', 'font-stretch',
      'line-height', 'letter-spacing', 'text-align', 'text-transform', 'text-decoration',
      'white-space', 'word-break', 'overflow', 'overflow-wrap', 'opacity', 'z-index',
      'object-fit', 'object-position', 'transform', 'transform-origin', 'flex',
      'flex-direction', 'align-items', 'align-content', 'align-self', 'justify-content',
      'gap', 'grid-template-columns', 'grid-template-rows', 'grid-column', 'grid-row',
    ]
    const styleParts = importantProperties
      .map((property) => `${property}:${computed.getPropertyValue(property)};`)
      .join('')
    target.setAttribute('style', styleParts)
  }
}

async function prepareClone(pageEl: HTMLElement, width: number, height: number): Promise<HTMLElement> {
  const clonedPage = pageEl.cloneNode(true) as HTMLElement

  // Inline styles before removing UI-only nodes so source/clone element indexes stay aligned.
  inlineComputedStyles(pageEl, clonedPage)
  await inlineBackgroundImages(pageEl, clonedPage)

  clonedPage
    .querySelectorAll('.page-indicator, .template-badge, .pdf-ui-only, .a4-page-badge')
    .forEach((el) => el.remove())

  clonedPage.style.transform = 'none'
  clonedPage.style.margin = '0'
  clonedPage.style.boxShadow = 'none'
  clonedPage.style.border = 'none'
  clonedPage.style.width = `${width}px`
  clonedPage.style.height = `${height}px`
  clonedPage.style.maxWidth = 'none'
  clonedPage.style.aspectRatio = 'auto'
  clonedPage.style.boxSizing = 'border-box'
  clonedPage.style.backgroundColor = '#ffffff'
  clonedPage.style.position = 'relative'
  clonedPage.style.overflow = 'hidden'

  const originals = Array.from(pageEl.querySelectorAll('img'))
  const images = Array.from(clonedPage.querySelectorAll('img'))
  const results = await Promise.all(
    images.map(async (cloneImg, index) => {
      const original = originals[index]
      if (original) await waitForImage(original)
      const dataUrl = await imageToDataUrl(original || cloneImg)
      if (dataUrl) {
        cloneImg.setAttribute('src', dataUrl)
        cloneImg.removeAttribute('srcset')
        cloneImg.removeAttribute('crossorigin')
      }
      return Boolean(dataUrl) || !(original?.src || cloneImg.src)
    }),
  )

  // A failed remote image should not silently become a broken SVG. Report it to
  // the caller while allowing already-local/data images to continue normally.
  const failed = results.some((ok) => !ok)
  if (failed) throw new Error('Satu atau lebih gambar report tidak dapat disematkan ke renderer Foreign Object.')

  return clonedPage
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/**
 * Render the existing report HTML through SVG foreignObject. No report template
 * is recreated: the browser-computed DOM is cloned, styles are inlined, images
 * are embedded, and the SVG image contains no external resource dependency.
 */
export async function renderPageElementToForeignObjectCanvas(
  pageEl: HTMLElement,
  options: { width?: number; height?: number; scale?: number } = {},
): Promise<HTMLCanvasElement> {
  const width = options.width || 1600
  const height = options.height || 900
  const scale = options.scale ?? DEFAULT_SCALE

  if (!Number.isFinite(scale) || scale <= 0) {
    throw new Error('Skala render harus berupa angka lebih besar dari 0.')
  }

  if (document.fonts?.ready) {
    await Promise.race([
      document.fonts.ready,
      new Promise<void>((resolve) => window.setTimeout(resolve, ASSET_TIMEOUT_MS)),
    ])
  }

  const clonedPage = await prepareClone(pageEl, width, height)
  const styles = await collectStyles()
  const serializer = new XMLSerializer()
  const html = serializer.serializeToString(clonedPage)

  const svg = `<?xml version="1.0" encoding="UTF-8"?>` +
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<foreignObject x="0" y="0" width="${width}" height="${height}">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;overflow:hidden;background:#fff;">` +
    `<style>${styles}</style>${html}</div>` +
    `</foreignObject></svg>`

  const url = svgDataUrl(svg)
  try {
    const image = new Image()
    image.decoding = 'async'
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('Foreign Object SVG timeout saat dirender.')), ASSET_TIMEOUT_MS)
      image.onload = () => {
        window.clearTimeout(timer)
        resolve()
      }
      image.onerror = () => {
        window.clearTimeout(timer)
        reject(new Error('Browser menolak merender SVG Foreign Object.'))
      }
      image.src = url
    })

    const outputWidth = Math.max(1, Math.round(width * scale))
    const outputHeight = Math.max(1, Math.round(height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = outputWidth
    canvas.height = outputHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D tidak tersedia.')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, outputWidth, outputHeight)
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(image, 0, 0, outputWidth, outputHeight)

    return canvas
  } finally {
    // data: URLs do not need URL.revokeObjectURL().
  }
}

export async function exportDocumentPagesToForeignObjectPdf(
  pageElements: HTMLElement[],
  options: ExportPdfOptions = {},
): Promise<void> {
  if (!pageElements?.length) throw new Error('Tidak ada halaman dokumen yang dapat diexport ke PDF!')

  const orientation = options.orientation || 'landscape'
  const widthPx = options.widthPx || 1600
  const heightPx = options.heightPx || 900
  const widthMm = options.widthMm || (orientation === 'landscape' ? 297 : 210)
  const heightMm = options.heightMm || Number(((widthMm * heightPx) / widthPx).toFixed(2))
  const scale = options.scale ?? DEFAULT_SCALE
  const filename = options.filename || 'Document - Foreign Object.pdf'

  if (!Number.isFinite(scale) || scale <= 0) throw new Error('Skala render harus berupa angka lebih besar dari 0.')

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [widthMm, heightMm],
    compress: true,
  })

  for (let i = 0; i < pageElements.length; i += 1) {
    const canvas = await renderPageElementToForeignObjectCanvas(pageElements[i], {
      width: widthPx,
      height: heightPx,
      scale,
    })

    try {
      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      if (i > 0) pdf.addPage([widthMm, heightMm], orientation)
      pdf.addImage(imgData, 'JPEG', 0, 0, widthMm, heightMm, undefined, 'FAST')
    } finally {
      canvas.width = 1
      canvas.height = 1
    }
  }

  pdf.save(filename)
}
