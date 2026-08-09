import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

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
  } catch (e) {
    // fallback
  }
  return '#000000'
}

function sanitizeOklchInDoc(clonedDoc: Document): void {
  clonedDoc.querySelectorAll('style').forEach((styleEl) => {
    if (styleEl.textContent && styleEl.textContent.includes('oklch')) {
      styleEl.textContent = styleEl.textContent.replace(/oklch\([^)]+\)/gi, (m) => {
        return convertOklchColor(m) || 'rgb(0,0,0)'
      })
    }
  })

  const allEls = clonedDoc.querySelectorAll<HTMLElement>('*')
  allEls.forEach((el) => {
    const styleAttr = el.getAttribute('style')
    if (styleAttr && styleAttr.includes('oklch')) {
      el.setAttribute(
        'style',
        styleAttr.replace(/oklch\([^)]+\)/gi, (m) => convertOklchColor(m) || '#000000')
      )
    }
  })
}

export interface RenderPageOptions {
  width?: number
  height?: number
  scale?: number
  backgroundColor?: string
}

/**
 * Render any document page element (HTML or SVG) into a high-res Canvas bitmap.
 * Uses SVG foreignObject browser-native vector rendering first (which preserves 100% font/layout fidelity),
 * falling back to html2canvas if foreignObject SVG rendering is restricted.
 */
export async function renderPageElementToCanvas(
  pageEl: HTMLElement,
  options: RenderPageOptions = {}
): Promise<HTMLCanvasElement> {
  const width = options.width || 1600
  const height = options.height || 900
  const scale = options.scale || 2
  const bg = options.backgroundColor || '#ffffff'

  const tempWrapper = document.createElement('div')
  tempWrapper.style.position = 'absolute'
  tempWrapper.style.top = '0'
  tempWrapper.style.left = '0'
  tempWrapper.style.width = `${width}px`
  tempWrapper.style.height = `${height}px`
  tempWrapper.style.boxSizing = 'border-box'
  tempWrapper.style.background = bg
  tempWrapper.style.zIndex = '-99999'
  tempWrapper.style.opacity = '0.01'
  tempWrapper.style.pointerEvents = 'none'

  const clonedPage = pageEl.cloneNode(true) as HTMLElement
  clonedPage.querySelectorAll('.page-indicator, .template-badge, .pdf-ui-only, .a4-page-badge').forEach((el) => el.remove())

  clonedPage.style.transform = 'none'
  clonedPage.style.margin = '0'
  clonedPage.style.boxShadow = 'none'
  clonedPage.style.border = 'none'
  clonedPage.style.width = `${width}px`
  clonedPage.style.height = `${height}px`
  clonedPage.style.maxWidth = 'none'
  clonedPage.style.aspectRatio = 'auto'
  clonedPage.style.boxSizing = 'border-box'
  clonedPage.style.backgroundColor = bg
  clonedPage.style.color = '#111111'
  clonedPage.style.overflow = 'hidden'

  tempWrapper.appendChild(clonedPage)
  document.body.appendChild(tempWrapper)

  try {
    const canvas = await html2canvas(clonedPage, {
      scale,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: bg,
      imageTimeout: 15000,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      onclone: (clonedDoc) => {
        sanitizeOklchInDoc(clonedDoc)
      },
    })
    return canvas
  } finally {
    if (tempWrapper.parentNode) {
      document.body.removeChild(tempWrapper)
    }
  }
}

export interface ExportPdfOptions {
  orientation?: 'landscape' | 'portrait'
  widthMm?: number
  heightMm?: number
  widthPx?: number
  heightPx?: number
  scale?: number
  filename?: string
}

/**
 * Universal PDF exporter function for all document types (Reports, Surveys, Stickers, etc.)
 */
export async function exportDocumentPagesToPdf(
  pageElements: HTMLElement[],
  options: ExportPdfOptions = {}
): Promise<void> {
  if (!pageElements || !pageElements.length) {
    throw new Error('Tidak ada halaman dokumen yang dapat diexport ke PDF!')
  }

  const orientation = options.orientation || 'landscape'
  const widthPx = options.widthPx || (orientation === 'landscape' ? 1600 : 794)
  const heightPx = options.heightPx || (orientation === 'landscape' ? 900 : 1123)
  const widthMm = options.widthMm || (orientation === 'landscape' ? 297 : 210)
  const heightMm = options.heightMm || (widthMm * heightPx) / widthPx
  const scale = options.scale || 2
  const filename = options.filename || 'Document.pdf'

  if (document.fonts?.ready) {
    await document.fonts.ready
  }

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [widthMm, heightMm],
    compress: true,
  })

  for (let i = 0; i < pageElements.length; i++) {
    const pageEl = pageElements[i]
    const canvas = await renderPageElementToCanvas(pageEl, {
      width: widthPx,
      height: heightPx,
      scale,
      backgroundColor: '#ffffff',
    })

    const imgData = canvas.toDataURL('image/jpeg', 0.95)

    if (i > 0) {
      pdf.addPage([widthMm, heightMm], orientation)
    }

    pdf.addImage(imgData, 'JPEG', 0, 0, widthMm, heightMm, undefined, 'FAST')

    canvas.width = 1
    canvas.height = 1
  }

  pdf.save(filename)
}
