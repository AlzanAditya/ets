import { jsPDF } from 'jspdf'
import { ExportPdfOptions } from './types'

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

function collectStyles(): string {
  const chunks: string[] = []

  document.querySelectorAll('style').forEach((style) => {
    if (style.textContent) chunks.push(style.textContent)
  })

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = Array.from(sheet.cssRules || [])
      if (rules.length) {
        chunks.push(rules.map((rule) => rule.cssText).join('\n'))
      }
    } catch {
      // Cross-origin stylesheets cannot expose cssRules. The existing <style>
      // tags and the report stylesheet are normally already covered above.
    }
  }

  const combined = sanitizeCss(chunks.join('\n'))
  const imports = Array.from(combined.matchAll(/@import\s+(?:url\([^)]*\)|[^;]+);/gi)).map((match) => match[0])
  const withoutImports = combined.replace(/@import\s+(?:url\([^)]*\)|[^;]+);/gi, '')
  return [...new Set(imports), withoutImports].join('\n')
}

async function waitForImage(img: HTMLImageElement, timeoutMs: number): Promise<void> {
  if (img.complete) return

  await new Promise<void>((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      img.removeEventListener('load', finish)
      img.removeEventListener('error', finish)
      resolve()
    }

    const timer = window.setTimeout(finish, timeoutMs)
    img.addEventListener('load', finish, { once: true })
    img.addEventListener('error', finish, { once: true })
  })
}

async function imageToDataUrl(img: HTMLImageElement): Promise<string | null> {
  const src = img.currentSrc || img.src
  if (!src) return null
  if (src.startsWith('data:')) return src
  if (src.startsWith('blob:')) {
    try {
      const response = await fetch(src)
      const blob = await response.blob()
      return await blobToDataUrl(blob)
    } catch {
      return null
    }
  }

  try {
    const response = await fetch(src, { mode: 'cors', credentials: 'omit' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const blob = await response.blob()
    return await blobToDataUrl(blob)
  } catch {
    return null
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error || new Error('Failed to read image blob'))
    reader.readAsDataURL(blob)
  })
}

async function prepareClone(pageEl: HTMLElement, width: number, height: number): Promise<HTMLElement> {
  const clonedPage = pageEl.cloneNode(true) as HTMLElement

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
  clonedPage.style.color = '#111111'
  clonedPage.style.position = 'relative'
  clonedPage.style.overflow = 'hidden'

  const images = Array.from(clonedPage.querySelectorAll('img'))
  const originals = Array.from(pageEl.querySelectorAll('img'))

  // Use the already-rendered preview as the source of truth. Images are
  // embedded into the SVG when CORS permits it, preventing the final canvas
  // from becoming tainted by CDN assets.
  await Promise.all(
    images.map(async (cloneImg, index) => {
      const original = originals[index]
      if (original) await waitForImage(original, 5000)

      const dataUrl = await imageToDataUrl(original || cloneImg)
      if (dataUrl) {
        cloneImg.setAttribute('src', dataUrl)
        cloneImg.removeAttribute('srcset')
      }
    })
  )

  return clonedPage
}

/**
 * Render a report page through SVG foreignObject so the browser keeps using
 * the existing HTML/CSS layout instead of html2canvas re-calculating text.
 */
export async function renderPageElementToForeignObjectCanvas(
  pageEl: HTMLElement,
  options: { width?: number; height?: number; scale?: number } = {}
): Promise<HTMLCanvasElement> {
  const width = options.width || 1600
  const height = options.height || 900
  const scale = options.scale || 1.5

  if (!Number.isFinite(scale) || scale <= 0) {
    throw new Error('Skala render harus berupa angka lebih besar dari 0.')
  }

  if (document.fonts?.ready) {
    await document.fonts.ready
  }

  const clonedPage = await prepareClone(pageEl, width, height)
  const styles = collectStyles()
  const serializer = new XMLSerializer()
  const html = serializer.serializeToString(clonedPage)

  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width * scale}" height="${height * scale}" viewBox="0 0 ${width} ${height}">` +
    `<foreignObject x="0" y="0" width="${width}" height="${height}">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;overflow:hidden;background:#fff;">` +
    `<style>${styles}</style>${html}</div>` +
    `</foreignObject></svg>`

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  try {
    const image = new Image()
    image.decoding = 'async'
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Foreign Object SVG gagal dirender oleh browser.'))
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
    ctx.drawImage(image, 0, 0, outputWidth, outputHeight)

    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function exportDocumentPagesToForeignObjectPdf(
  pageElements: HTMLElement[],
  options: ExportPdfOptions = {}
): Promise<void> {
  if (!pageElements?.length) {
    throw new Error('Tidak ada halaman dokumen yang dapat diexport ke PDF!')
  }

  const orientation = options.orientation || 'landscape'
  const widthPx = options.widthPx || 1600
  const heightPx = options.heightPx || 900
  const widthMm = options.widthMm || (orientation === 'landscape' ? 297 : 210)
  const heightMm = options.heightMm || Number(((widthMm * heightPx) / widthPx).toFixed(2))
  const scale = options.scale || 1.5
  const filename = options.filename || 'Document - Foreign Object.pdf'
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

    const imgData = canvas.toDataURL('image/jpeg', 0.95)
    if (i > 0) pdf.addPage([widthMm, heightMm], orientation)
    pdf.addImage(imgData, 'JPEG', 0, 0, widthMm, heightMm, undefined, 'FAST')

    canvas.width = 1
    canvas.height = 1
  }

  pdf.save(filename)
}
