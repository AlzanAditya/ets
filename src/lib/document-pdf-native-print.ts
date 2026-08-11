import { buildIsolatedPrintDocument, collectPrintStyles } from './document-print-template'

export interface ExportNativePrintOptions {
  filename?: string
  widthPx?: number
  heightPx?: number
  orientation?: 'landscape' | 'portrait'
}

/**
 * Native browser print exporter.
 *
 * IMPORTANT: printing happens in a brand-new HTML document. The ETS application
 * shell, React root, navigation, forms, toolbars, etc. are never placed in the
 * print document. Only the supplied document pages are rendered there.
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

  const isA4 = orientation === 'portrait' || (widthPx === 794 && heightPx === 1123)
  const pageWidth = isA4 ? '210mm' : `${widthPx}px`
  const pageHeight = isA4 ? '297mm' : `${heightPx}px`
  const pageSize = isA4 ? 'A4 portrait' : `${(widthPx / 96).toFixed(4)}in ${(heightPx / 96).toFixed(4)}in`

  // Open the print window synchronously before any await so browser popup
  // blockers still consider this a user-initiated action.
  const printWindow = window.open('', '_blank', 'noopener,noreferrer')
  if (!printWindow) {
    throw new Error('Jendela print diblokir oleh browser. Izinkan pop-up untuk melanjutkan.')
  }

  // Clone ONLY the document roots supplied by the caller. Do not clone their
  // preview wrappers or any ancestor belonging to the application UI.
  const pageHtml = pageElements
    .map((pageEl) => {
      const clone = pageEl.cloneNode(true) as HTMLElement

      clone
        .querySelectorAll('.page-indicator, .template-badge, .pdf-ui-only, .a4-page-badge, .render-scale-control, .no-print')
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

  let cleaned = false
  const cleanup = () => {
    if (cleaned) return
    cleaned = true
    try {
      printWindow.close()
    } catch {
      // Ignore close errors.
    }
  }

  try {
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()

    await waitForPrintDocument(printWindow)

    // Give the browser two layout frames after assets are ready. This is
    // especially important for scaled/complex report pages.
    await nextAnimationFrame(printWindow)
    await nextAnimationFrame(printWindow)

    return await new Promise<void>((resolve, reject) => {
      let settled = false

      const finish = () => {
        if (settled) return
        settled = true
        printWindow.removeEventListener('afterprint', finish)
        window.clearTimeout(fallbackTimer)
        cleanup()
        resolve()
      }

      const fallbackTimer = window.setTimeout(finish, 60000)
      printWindow.addEventListener('afterprint', finish, { once: true })

      try {
        printWindow.focus()
        printWindow.print()
      } catch (error) {
        if (settled) return
        settled = true
        printWindow.removeEventListener('afterprint', finish)
        window.clearTimeout(fallbackTimer)
        cleanup()
        reject(error)
      }
    })
  } catch (error) {
    cleanup()
    throw error
  }
}

async function waitForPrintDocument(printWindow: Window): Promise<void> {
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
    try {
      await Promise.race([
        doc.fonts.ready,
        new Promise<void>((resolve) => printWindow.setTimeout(resolve, 5000)),
      ])
    } catch {
      // Continue with system fonts if a font fails.
    }
  }

  const images = Array.from(doc.images)
  await Promise.all(
    images.map(async (img) => {
      if (!img.complete) {
        await new Promise<void>((resolve) => {
          let done = false
          const finish = () => {
            if (done) return
            done = true
            resolve()
          }
          img.addEventListener('load', finish, { once: true })
          img.addEventListener('error', finish, { once: true })
          printWindow.setTimeout(finish, 5000)
        })
      }

      if (img.decode) {
        try {
          await img.decode()
        } catch {
          // The browser may still print a successfully loaded image.
        }
      }
    })
  )

  // Force layout before print.
  void doc.body.offsetHeight
  doc.querySelectorAll<HTMLElement>('.native-print-page').forEach((page) => {
    void page.offsetHeight
    void page.getBoundingClientRect()
  })
}

function nextAnimationFrame(printWindow: Window): Promise<void> {
  return new Promise((resolve) => {
    printWindow.requestAnimationFrame(() => resolve())
  })
}
