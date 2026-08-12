export interface ExportNativePrintOptions {
  filename?: string
  widthPx?: number
  heightPx?: number
  orientation?: 'landscape' | 'portrait'
}

/**
 * Universal isolated native print exporter.
 * Clones target pages into an offscreen .native-print-container on document.body,
 * dynamically injects a temporary @media print stylesheet that hides all web app UI
 * (#root, navbars, forms, toolbars, sidebars) and renders ONLY the cloned document pages,
 * sets explicit @page sizing (16:9 Landscape for Reports, A4 Portrait for Stickers),
 * awaits web fonts, image loading & decoding, and DOM layout reflow (with 4s max timeout),
 * then calls window.print() for 100% vector, searchable PDF generation.
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

  // Determine explicit @page CSS size rule
  // 1600px / 96 = 16.6667in, 900px / 96 = 9.375in (16:9 Landscape Widescreen)
  // 794px / 96 = 8.2708in, 1123px / 96 = 11.6979in (210mm x 297mm A4 Portrait)
  let pageCssSize = ''
  if (orientation === 'portrait' || (widthPx === 794 && heightPx === 1123)) {
    pageCssSize = '210mm 297mm'
  } else {
    const widthIn = Number((widthPx / 96).toFixed(4))
    const heightIn = Number((heightPx / 96).toFixed(4))
    pageCssSize = `${widthIn}in ${heightIn}in`
  }

  // 1. Create native print container directly on document.body
  const printContainer = document.createElement('div')
  printContainer.className = 'native-print-container'

  // 2. Clone each page element into the container
  pageElements.forEach((pageEl, idx) => {
    const clonedPage = pageEl.cloneNode(true) as HTMLElement

    // Remove UI badges, indicators, scale controls, and non-printable elements
    clonedPage
      .querySelectorAll('.page-indicator, .template-badge, .pdf-ui-only, .a4-page-badge, .render-scale-control, .no-print')
      .forEach((el) => el.remove())

    clonedPage.classList.add('native-print-page')
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
    clonedPage.style.pageBreakInside = 'avoid'
    clonedPage.style.breakInside = 'avoid'
    clonedPage.style.overflow = 'hidden'

    printContainer.appendChild(clonedPage)
  })

  // 3. Inject dynamic temporary @media print stylesheet into document head
  const dynamicStyleId = 'dynamic-native-print-style'
  const existingStyle = document.getElementById(dynamicStyleId)
  if (existingStyle) {
    existingStyle.remove()
  }

  const styleEl = document.createElement('style')
  styleEl.id = dynamicStyleId
  styleEl.textContent = `
    @media screen {
      .native-print-container {
        display: none !important;
      }
    }

    @media print {
      @page {
        size: ${pageCssSize};
        margin: 0;
      }

      /* Hide ALL web app UI (navbar, forms, sidebars, toolbars, controls) */
      body > *:not(.native-print-container) {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        overflow: hidden !important;
      }

      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background-color: #ffffff !important;
        color: #000000 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        width: 100% !important;
      }

      .native-print-container {
        display: block !important;
        visibility: visible !important;
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        background-color: #ffffff !important;
      }

      .native-print-container * {
        visibility: visible !important;
      }

      .native-print-page {
        width: ${widthPx}px !important;
        height: ${heightPx}px !important;
        max-width: none !important;
        max-height: none !important;
        transform: none !important;
        margin: 0 !important;
        box-shadow: none !important;
        box-sizing: border-box !important;
        position: relative !important;
        background-color: #ffffff !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        overflow: hidden !important;
      }

      .native-print-page:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }
    }
  `

  document.head.appendChild(styleEl)
  document.body.appendChild(printContainer)
  document.body.classList.add('is-native-printing')

  // 4. Await web fonts readiness, image loading/decoding & layout reflow with 4-second timeout guard
  const prepareAssetsPromise = async () => {
    // Fonts readiness
    if (document.fonts?.ready) {
      try {
        await document.fonts.ready
      } catch (e) {
        // Ignore font loading timeout/errors
      }
    }

    // Images loading & decoding inside print container
    const images = Array.from(printContainer.querySelectorAll('img'))
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

    // Brief pause for browser layout reflow
    await new Promise((resolve) => setTimeout(resolve, 300))
  }

  const timeoutGuardPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('Proses penyiapan cetak PDF melebihi batas waktu (4 detik). Silakan coba lagi.'))
    }, 4000)
  })

  // Cleanup helper
  const performCleanup = () => {
    document.body.classList.remove('is-native-printing')
    if (styleEl.parentNode) {
      styleEl.parentNode.removeChild(styleEl)
    }
    if (printContainer.parentNode) {
      printContainer.parentNode.removeChild(printContainer)
    }
  }

  try {
    await Promise.race([prepareAssetsPromise(), timeoutGuardPromise])
  } catch (err) {
    performCleanup()
    throw err
  }

  // 5. Trigger native browser print dialog & clean up after printing
  return new Promise<void>((resolve) => {
    let cleanedUp = false

    const cleanup = () => {
      if (cleanedUp) return
      cleanedUp = true
      window.removeEventListener('afterprint', cleanup)
      performCleanup()
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
      console.error('Window print error:', err)
      cleanup()
    }
  })
}
