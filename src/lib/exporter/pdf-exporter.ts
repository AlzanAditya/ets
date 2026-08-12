import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { ExportPdfOptions, RenderPageOptions } from './types'

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

/**
 * Render any document page element (HTML or SVG) into a high-res Canvas bitmap,
 * purging dark mode and ensuring 100% visual fidelity matching the DOM preview.
 */
export async function renderPageElementToCanvas(
  pageEl: HTMLElement,
  options: RenderPageOptions = {}
): Promise<HTMLCanvasElement> {
  const width = options.width || 1600
  const height = options.height || 900
  const scale = options.scale || 2
  const bg = options.backgroundColor || '#ffffff'
  const isReportsBitmap = options.renderProfile === 'reports-bitmap'

  // Reports use a dedicated bitmap profile that renders the clone as a normal,
  // visible DOM tree in an off-screen export root. This keeps text metrics close
  // to the proven reference pipeline while leaving other document exporters intact.
  const exportRoot = document.createElement('div')
  exportRoot.className = 'pdf-export-root'
  exportRoot.setAttribute('aria-hidden', 'true')
  exportRoot.style.cssText = isReportsBitmap
    ? [
        'position:fixed',
        'left:-20000px',
        'top:0',
        `width:${width}px`,
        'height:auto',
        'z-index:0',
        'pointer-events:none',
        `background:${bg}`,
        'visibility:visible',
      ].join(';')
    : [
        'position:fixed',
        'top:0',
        'left:0',
        `width:${width}px`,
        `height:${height}px`,
        'box-sizing:border-box',
        `background:${bg}`,
        'z-index:-99999',
        'opacity:1',
        'pointer-events:none',
      ].join(';')

  const clonedPage = pageEl.cloneNode(true) as HTMLElement

  clonedPage
    .querySelectorAll('.page-indicator, .template-badge, .pdf-ui-only, .a4-page-badge')
    .forEach((el) => el.remove())

  clonedPage.classList.add('pdf-export-page')
  clonedPage.style.width = `${width}px`
  clonedPage.style.height = `${height}px`
  clonedPage.style.maxWidth = 'none'
  clonedPage.style.aspectRatio = 'auto'
  clonedPage.style.margin = '0'
  clonedPage.style.transform = 'none'
  clonedPage.style.boxShadow = 'none'
  clonedPage.style.border = 'none'
  clonedPage.style.boxSizing = 'border-box'
  clonedPage.style.backgroundColor = bg
  clonedPage.style.overflow = 'hidden'

  exportRoot.appendChild(clonedPage)
  document.body.appendChild(exportRoot)

  const waitForAssets = async () => {
    if (document.fonts?.ready) {
      await document.fonts.ready
    }

    // Explicitly request the report fonts used by the document. This does not
    // use img.decode(), because decode() can reject for CDN/CORS images even
    // after the browser has successfully displayed them in the live preview.
    if (document.fonts?.load) {
      await Promise.allSettled([
        document.fonts.load("800 49.6px Raleway"),
        document.fonts.load("700 25.92px Raleway"),
        document.fonts.load("700 44.8px Raleway"),
      ])
    }

    const imgs = Array.from(clonedPage.querySelectorAll('img'))
    await Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            let settled = false
            let timeoutId = 0

            const done = () => {
              if (settled) return
              settled = true
              window.clearTimeout(timeoutId)
              img.removeEventListener('load', done)
              img.removeEventListener('error', done)
              resolve()
            }

            if (img.complete) {
              done()
              return
            }

            timeoutId = window.setTimeout(done, 8000)
            img.addEventListener('load', done, { once: true })
            img.addEventListener('error', done, { once: true })
          })
      )
    )

    // Let the browser perform at least two layout/paint passes after fonts and
    // images are ready. This is intentionally short and bounded.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    )
  }

  try {
    await waitForAssets()

    const canvas = await html2canvas(clonedPage, {
      scale,
      useCORS: true,
      // Keep this false for the report bitmap export. A tainted canvas is not
      // useful for toDataURL() and can hide the real asset/CORS problem.
      allowTaint: isReportsBitmap ? false : true,
      logging: false,
      backgroundColor: bg,
      imageTimeout: 15000,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      removeContainer: true,
      onclone: (clonedDoc) => {
        clonedDoc.documentElement.classList.remove('dark')
        clonedDoc.body.classList.remove('dark')
        clonedDoc.documentElement.style.backgroundColor = bg
        clonedDoc.body.style.backgroundColor = bg
        clonedDoc.documentElement.style.colorScheme = 'light'

        clonedDoc.querySelectorAll('.dark').forEach((el) => el.classList.remove('dark'))
        sanitizeOklchInDoc(clonedDoc)
      },
    })

    return canvas
  } finally {
    exportRoot.remove()
  }
}

/**
 * Universal PDF exporter function for all document types (Reports, Surveys, Stickers, etc.).
 * Renders page by page into high-res pixel-perfect canvases and embeds into PDF.
 */
export async function exportDocumentPagesToPdf(
  pageElements: HTMLElement[],
  options: ExportPdfOptions = {}
): Promise<void> {
  if (!pageElements || !pageElements.length) {
    throw new Error('Tidak ada halaman dokumen yang dapat diexport ke PDF!')
  }

  if (document.fonts?.ready) {
    await document.fonts.ready
  }

  const orientation = options.orientation || 'landscape'
  const widthPx = options.widthPx || (orientation === 'landscape' ? 1600 : 794)
  const heightPx = options.heightPx || (orientation === 'landscape' ? 900 : 1123)
  const widthMm = options.widthMm || (orientation === 'landscape' ? 297 : 210)
  const heightMm = options.heightMm || Number(((widthMm * heightPx) / widthPx).toFixed(2))
  const scale = options.scale || 2
  const filename = options.filename || 'Document.pdf'
  const bg = options.backgroundColor || '#ffffff'

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
      backgroundColor: bg,
    })

    const imgData = canvas.toDataURL('image/jpeg', 0.95)

    if (i > 0) {
      pdf.addPage([widthMm, heightMm], orientation)
    }

    pdf.addImage(imgData, 'JPEG', 0, 0, widthMm, heightMm, undefined, 'FAST')

    // Clean canvas reference to release memory
    canvas.width = 1
    canvas.height = 1
  }

  pdf.save(filename)
}

/**
 * Native print fallback helper for browser printing
 */
export function exportViaPrintWindow(): void {
  window.print()
}
