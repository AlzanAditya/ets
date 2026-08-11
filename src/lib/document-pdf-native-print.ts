import { buildIsolatedPrintDocument, collectPrintStyles } from './document-print-template'

export interface ExportNativePrintOptions {
  filename?: string
  widthPx?: number
  heightPx?: number
  orientation?: 'landscape' | 'portrait'
  assetTimeoutMs?: number
  fontTimeoutMs?: number
}

/**
 * Native browser print exporter.
 *
 * The print document is isolated from the ETS application shell. The supplied
 * page elements are cloned into a brand-new document, so navigation, forms,
 * toolbars and other application UI can never become part of the print tree.
 *
 * Before cloning, the original preview is treated as the source of truth for
 * asset readiness. This is important for ETS because report/sticker assets can
 * come from local files or the CDN and SmartImage may still be resolving a
 * fallback URL when the user clicks Print.
 */
export async function exportDocumentPagesToNativePrint(
  pageElements: HTMLElement[],
  options: ExportNativePrintOptions = {}
): Promise<void> {
  if (!pageElements?.length) {
    throw new Error('Tidak ada halaman dokumen yang dapat dicetak/diexport!')
  }

  const orientation = options.orientation || 'landscape'
  const widthPx = options.widthPx || (orientation === 'landscape' ? 1600 : 794)
  const heightPx = options.heightPx || (orientation === 'landscape' ? 900 : 1123)
  const assetTimeoutMs = options.assetTimeoutMs ?? 8000
  const fontTimeoutMs = options.fontTimeoutMs ?? 3000

  const isA4 = orientation === 'portrait' || (widthPx === 794 && heightPx === 1123)
  const pageWidth = isA4 ? '210mm' : `${widthPx}px`
  const pageHeight = isA4 ? '297mm' : `${heightPx}px`
  const pageSize = isA4
    ? 'A4 portrait'
    : `${(widthPx / 96).toFixed(4)}in ${(heightPx / 96).toFixed(4)}in`

  // Open synchronously from the user click so popup blockers do not interfere.
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    throw new Error('Jendela print diblokir oleh browser. Izinkan pop-up untuk melanjutkan.')
  }

  // Keep the new window useful while the source preview is being checked.
  printWindow.document.open()
  printWindow.document.write(buildPrintLoadingDocument())
  printWindow.document.close()

  try {
    const initialReadiness = getSourcePreviewReadiness(pageElements)

    if (!initialReadiness.ready) {
      const shouldWait = window.confirm(
        `Dokumen belum selesai dimuat.\n\n` +
          `${initialReadiness.pendingImages} gambar/aset masih dimuat dan ` +
          `${initialReadiness.fontsPending ? 'font masih dimuat' : 'font sudah siap'}.\n\n` +
          `Pilih OK untuk menunggu hingga siap, atau Batal untuk membatalkan Native Print.`
      )

      if (!shouldWait) {
        printWindow.close()
        return
      }

      const waitedReadiness = await waitForSourcePreviewReady(
        pageElements,
        assetTimeoutMs,
        fontTimeoutMs
      )

      if (!waitedReadiness.ready) {
        const shouldContinue = window.confirm(
          `Sebagian aset masih belum siap setelah ${Math.round(assetTimeoutMs / 1000)} detik.\n\n` +
            `${waitedReadiness.pendingImages} gambar/aset belum siap` +
            `${waitedReadiness.fontsPending ? ' dan font belum selesai dimuat' : ''}.\n\n` +
            `OK = tetap lanjutkan Native Print\nBatal = batalkan` 
        )

        if (!shouldContinue) {
          printWindow.close()
          return
        }
      }
    }

    // Clone ONLY the document roots supplied by the caller. Do not clone their
    // preview wrappers or any ancestor belonging to the application UI.
    const pageHtml = pageElements
      .map((pageEl) => {
        const clone = pageEl.cloneNode(true) as HTMLElement

        clone
          .querySelectorAll(
            '.page-indicator, .template-badge, .pdf-ui-only, .a4-page-badge, .render-scale-control, .no-print'
          )
          .forEach((el) => el.remove())

        clone.classList.add('native-print-page')
        clone.style.transform = 'none'
        clone.style.margin = '0'
        clone.style.boxShadow = 'none'
        clone.style.maxWidth = 'none'
        clone.style.maxHeight = 'none'
        clone.style.position = 'relative'
        clone.style.boxSizing = 'border-box'
        clone.style.overflow = 'hidden'
        clone.style.pageBreakAfter = 'always'
        clone.style.breakAfter = 'page'

        return clone.outerHTML
      })
      .join('\n')

    const stylesHtml = collectPrintStyles()
    const html = buildIsolatedPrintDocument(pageHtml, stylesHtml, {
      pageWidth,
      pageHeight,
      pageSize,
      title: options.filename || 'ETS Document',
    })

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()

    // The source preview was already validated. The print document only needs
    // a bounded safety wait for the browser to attach its cloned assets.
    await waitForPrintDocument(printWindow, assetTimeoutMs, fontTimeoutMs)
    await nextAnimationFrame(printWindow)
    await nextAnimationFrame(printWindow)

    printWindow.focus()
    printWindow.print()
  } catch (error) {
    try {
      printWindow.close()
    } catch {
      // Ignore close errors.
    }
    throw error
  }
}

interface PreviewReadiness {
  ready: boolean
  pendingImages: number
  failedImages: number
  fontsPending: boolean
}

function getSourcePreviewReadiness(pageElements: HTMLElement[]): PreviewReadiness {
  const images = pageElements.flatMap((page) =>
    Array.from(page.querySelectorAll<HTMLImageElement>('img'))
  )

  let pendingImages = 0
  let failedImages = 0

  for (const image of images) {
    if (!image.complete) {
      pendingImages++
    } else if (image.naturalWidth === 0) {
      // SmartImage may still be switching from a failed local URL to its CDN
      // fallback. Treat it as pending rather than immediately as a fatal error.
      pendingImages++
      failedImages++
    }
  }

  const fontsPending = document.fonts ? document.fonts.status !== 'loaded' : false

  return {
    ready: pendingImages === 0 && !fontsPending,
    pendingImages,
    failedImages,
    fontsPending,
  }
}

async function waitForSourcePreviewReady(
  pageElements: HTMLElement[],
  assetTimeoutMs: number,
  fontTimeoutMs: number
): Promise<PreviewReadiness> {
  const imagePromise = waitForSourceImages(pageElements, assetTimeoutMs)
  const fontPromise = waitForSourceFonts(fontTimeoutMs)

  await Promise.all([imagePromise, fontPromise])
  return getSourcePreviewReadiness(pageElements)
}

async function waitForSourceImages(pageElements: HTMLElement[], timeoutMs: number): Promise<void> {
  const images = pageElements.flatMap((page) =>
    Array.from(page.querySelectorAll<HTMLImageElement>('img'))
  )

  if (!images.length) return

  await Promise.all(
    images.map((img) =>
      new Promise<void>((resolve) => {
        if (img.complete && img.naturalWidth > 0) {
          resolve()
          return
        }

        let finished = false
        const finish = () => {
          if (finished) return
          finished = true
          img.removeEventListener('load', finish)
          img.removeEventListener('error', finish)
          window.clearTimeout(timer)
          resolve()
        }

        const timer = window.setTimeout(finish, timeoutMs)
        img.addEventListener('load', finish, { once: true })
        img.addEventListener('error', finish, { once: true })
      })
    )
  )
}

async function waitForSourceFonts(timeoutMs: number): Promise<void> {
  if (!document.fonts?.ready) return

  await Promise.race([
    document.fonts.ready.then(() => undefined).catch(() => undefined),
    new Promise<void>((resolve) => window.setTimeout(resolve, timeoutMs)),
  ])
}

async function waitForPrintDocument(
  printWindow: Window,
  assetTimeoutMs: number,
  fontTimeoutMs: number
): Promise<void> {
  const doc = printWindow.document

  if (doc.readyState !== 'complete') {
    await new Promise<void>((resolve) => {
      const done = () => {
        printWindow.removeEventListener('load', done)
        resolve()
      }
      printWindow.addEventListener('load', done, { once: true })
      printWindow.setTimeout(done, 5000)
    })
  }

  if (doc.fonts?.ready) {
    await Promise.race([
      doc.fonts.ready.then(() => undefined).catch(() => undefined),
      new Promise<void>((resolve) => printWindow.setTimeout(resolve, fontTimeoutMs)),
    ])
  }

  const images = Array.from(doc.images)
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve()
            return
          }

          let finished = false
          const finish = () => {
            if (finished) return
            finished = true
            img.removeEventListener('load', finish)
            img.removeEventListener('error', finish)
            printWindow.clearTimeout(timer)
            resolve()
          }

          const timer = printWindow.setTimeout(finish, assetTimeoutMs)
          img.addEventListener('load', finish, { once: true })
          img.addEventListener('error', finish, { once: true })
        })
    )
  )

  void doc.body.offsetHeight
  doc.querySelectorAll<HTMLElement>('.native-print-page').forEach((page) => {
    void page.offsetHeight
    void page.getBoundingClientRect()
  })
}

function buildPrintLoadingDocument(): string {
  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ETS — Menyiapkan Print</title>
  <style>
    html, body { margin: 0; min-height: 100%; font-family: system-ui, sans-serif; }
    body { display: grid; place-items: center; background: #fff; color: #111; }
    .loading { text-align: center; padding: 32px; }
  </style>
</head>
<body>
  <div class="loading">Menyiapkan dokumen untuk dicetak…</div>
</body>
</html>`
}

function nextAnimationFrame(printWindow: Window): Promise<void> {
  return new Promise((resolve) => {
    printWindow.requestAnimationFrame(() => resolve())
  })
}
