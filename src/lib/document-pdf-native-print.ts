export interface ExportNativePrintOptions {
  filename?: string
  widthPx?: number
  heightPx?: number
  orientation?: 'landscape' | 'portrait'
}

/**
 * Universal native browser print exporter function.
 * Clones page elements directly into an in-place .print-only-root container on document.body,
 * dynamically injects @page sizing CSS derived from pixel dimensions (px / 96 = inches),
 * uses await for web fonts, image loading, and layout rendering ticks,
 * then triggers browser window.print() for 100% vector, searchable PDF generation.
 */
export async function exportDocumentPagesToNativePrint(
  pageElements: HTMLElement[],
  options: ExportNativePrintOptions = {}
): Promise<void> {
  if (!pageElements || !pageElements.length) {
    throw new Error('Tidak ada halaman dokumen yang dapat dicetak/diexport!')
  }

  const orientation = options.orientation || 'landscape'
  const widthPx = options.widthPx || (orientation === 'landscape' ? 1600 : 794)
  const heightPx = options.heightPx || (orientation === 'landscape' ? 900 : 1123)

  // Calculate paper size in inches for @page CSS (96 DPI standard browser reference)
  // 1600px / 96 = 16.6667in, 900px / 96 = 9.375in (Exact 16:9 widescreen presentation)
  // 794px / 96 = 8.2708in, 1123px / 96 = 11.6979in (Exact A4 paper)
  const widthIn = Number((widthPx / 96).toFixed(4))
  const heightIn = Number((heightPx / 96).toFixed(4))

  // 1. Create print container root directly in active DOM to retain all styles & assets
  const printRoot = document.createElement('div')
  printRoot.className = 'print-only-root'

  // 2. Clone each page element into print container root
  pageElements.forEach((pageEl, idx) => {
    const clonedPage = pageEl.cloneNode(true) as HTMLElement

    // Remove UI badges, indicators, and non-printable elements
    clonedPage
      .querySelectorAll('.page-indicator, .template-badge, .pdf-ui-only, .a4-page-badge, .render-scale-control')
      .forEach((el) => el.remove())

    // Enforce 1:1 dimension matching preview
    clonedPage.style.width = `${widthPx}px`
    clonedPage.style.height = `${heightPx}px`
    clonedPage.style.maxWidth = 'none'
    clonedPage.style.maxHeight = 'none'
    clonedPage.style.transform = 'none'
    clonedPage.style.margin = '0'
    clonedPage.style.boxShadow = 'none'
    clonedPage.style.boxSizing = 'border-box'
    clonedPage.style.position = 'relative'
    clonedPage.style.backgroundColor = '#ffffff'
    clonedPage.style.pageBreakAfter = idx === pageElements.length - 1 ? 'auto' : 'always'
    clonedPage.style.breakAfter = idx === pageElements.length - 1 ? 'auto' : 'page'

    printRoot.appendChild(clonedPage)
  })

  // 3. Inject dynamic @page style tag into document head
  const dynamicStyleId = 'dynamic-print-page-style'
  const existingStyle = document.getElementById(dynamicStyleId)
  if (existingStyle) {
    existingStyle.remove()
  }

  const styleEl = document.createElement('style')
  styleEl.id = dynamicStyleId
  styleEl.textContent = `
    @page {
      size: ${widthIn}in ${heightIn}in;
      margin: 0;
    }
  `
  document.head.appendChild(styleEl)
  document.body.appendChild(printRoot)

  // 4. Prepare fonts, images, and layout with a strict 4-second timeout guard
  const prepareAssetsPromise = async () => {
    // Web fonts readiness
    if (document.fonts?.ready) {
      try {
        await document.fonts.ready
      } catch (e) {
        // Ignore font loading errors/timeouts
      }
    }

    // Images loading & decoding inside cloned pages
    const images = Array.from(printRoot.querySelectorAll('img'))
    await Promise.all(
      images.map((img) => {
        if (img.complete && img.naturalWidth > 0) {
          return Promise.resolve()
        }
        return new Promise<void>((resolve) => {
          let settled = false
          const done = () => {
            if (!settled) {
              settled = true
              resolve()
            }
          }
          img.onload = done
          img.onerror = done
          if (img.decode) {
            img.decode().then(done).catch(done)
          }
          setTimeout(done, 1500)
        })
      })
    )

    // Render tick pause (300ms) for DOM layout engine
    await new Promise((resolve) => setTimeout(resolve, 300))
  }

  const timeoutGuardPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('Proses penyiapan cetak PDF melebihi batas waktu (4 detik). Silakan coba lagi.'))
    }, 4000)
  })

  try {
    await Promise.race([prepareAssetsPromise(), timeoutGuardPromise])
  } catch (err) {
    // Clean up inserted DOM elements on timeout or error
    if (styleEl.parentNode) {
      styleEl.parentNode.removeChild(styleEl)
    }
    if (printRoot.parentNode) {
      printRoot.parentNode.removeChild(printRoot)
    }
    throw err
  }

  // 7. Trigger native browser print dialog
  return new Promise<void>((resolve) => {
    let cleanedUp = false

    const cleanup = () => {
      if (cleanedUp) return
      cleanedUp = true

      window.removeEventListener('afterprint', cleanup)
      if (styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl)
      }
      if (printRoot.parentNode) {
        printRoot.parentNode.removeChild(printRoot)
      }
      resolve()
    }

    window.addEventListener('afterprint', cleanup, { once: true })

    // Fallback cleanup timer in case afterprint doesn't fire immediately
    setTimeout(() => {
      cleanup()
    }, 60000)

    try {
      window.print()
    } catch (err) {
      console.error('Browser print error:', err)
      cleanup()
    }
  })
}
