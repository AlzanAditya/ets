export interface ExportNativePrintOptions {
  filename?: string
  widthPx?: number
  heightPx?: number
  orientation?: 'landscape' | 'portrait'
}

/**
 * Universal isolated native print exporter.
 * Creates an isolated <iframe> appended to document.body, populating its document ONLY
 * with cloned target page elements (.a4-page or .report-page) and required stylesheets.
 * The main web application DOM (navbar, sidebars, forms, toolbars) DOES NOT exist
 * inside the iframe document, ensuring 100% vector, clean native printing / Save as PDF.
 * Sets explicit @page sizing (16:9 Landscape for Reports, A4 Portrait for Stickers),
 * awaits web fonts, image loading & decoding, and DOM layout reflow (with 4s max timeout),
 * then calls iframe.contentWindow.print().
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

  // 1. Create an isolated <iframe> element attached to document.body
  const iframe = document.createElement('iframe')
  iframe.className = 'isolated-print-iframe'
  iframe.style.position = 'fixed'
  iframe.style.top = '0'
  iframe.style.left = '0'
  iframe.style.width = '100vw'
  iframe.style.height = '100vh'
  iframe.style.zIndex = '999999'
  iframe.style.border = 'none'
  iframe.style.backgroundColor = '#ffffff'
  document.body.appendChild(iframe)

  const iframeWin = iframe.contentWindow
  const iframeDoc = iframe.contentDocument || iframeWin?.document
  if (!iframeDoc || !iframeWin) {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe)
    }
    throw new Error('Gagal membuat dokumen cetak terisolasi!')
  }

  // 2. Collect head styles from main document
  const headStyles = Array.from(
    document.querySelectorAll('head style, head link[rel="stylesheet"]')
  )
    .map((el) => el.outerHTML)
    .join('\n')

  // 3. Clone each page element and clean non-printable elements
  const pageClones = pageElements.map((pageEl, idx) => {
    const clonedPage = pageEl.cloneNode(true) as HTMLElement

    // Remove UI badges, indicators, scale controls, and non-printable elements
    clonedPage
      .querySelectorAll(
        '.page-indicator, .template-badge, .pdf-ui-only, .a4-page-badge, .render-scale-control, .no-print'
      )
      .forEach((el) => el.remove())

    clonedPage.classList.add('isolated-print-page')
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

    return clonedPage
  })

  // 4. Write isolated document structure into iframe
  iframeDoc.open()
  iframeDoc.write(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>${options.filename || 'Dokumen'}</title>
  <base href="${window.location.origin}/">
  ${headStyles}
  <style>
    @page {
      size: ${pageCssSize};
      margin: 0;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background-color: #ffffff !important;
      color: #000000 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      width: ${widthPx}px !important;
    }
    body {
      box-sizing: border-box;
      background-color: #ffffff !important;
    }
    #print-root {
      width: 100%;
      margin: 0;
      padding: 0;
      background-color: #ffffff;
    }
    .isolated-print-page {
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
    .isolated-print-page:last-child {
      page-break-after: auto !important;
      break-after: auto !important;
    }
  </style>
</head>
<body>
  <div id="print-root"></div>
</body>
</html>`)
  iframeDoc.close()

  const printRoot = iframeDoc.getElementById('print-root')
  if (printRoot) {
    pageClones.forEach((clone) => printRoot.appendChild(clone))
  }

  // Helper for cleaning up iframe
  const removeIframe = () => {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe)
    }
  }

  // 5. Await web fonts readiness, image loading/decoding & layout reflow with 4-second timeout guard
  const prepareAssetsPromise = async () => {
    // Fonts readiness
    if (document.fonts?.ready) {
      try {
        await document.fonts.ready
      } catch (e) {
        // Ignore font loading errors
      }
    }
    if (iframeDoc.fonts?.ready) {
      try {
        await iframeDoc.fonts.ready
      } catch (e) {
        // Ignore font loading errors
      }
    }

    // Images loading & decoding inside iframe
    const images = Array.from(iframeDoc.querySelectorAll('img'))
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

  try {
    await Promise.race([prepareAssetsPromise(), timeoutGuardPromise])
  } catch (err) {
    removeIframe()
    throw err
  }

  // 6. Trigger native print from iframe & clean up after printing
  return new Promise<void>((resolve) => {
    let cleanedUp = false

    const doCleanup = () => {
      if (cleanedUp) return
      cleanedUp = true
      iframeWin.removeEventListener('afterprint', doCleanup)
      window.removeEventListener('afterprint', doCleanup)
      removeIframe()
      resolve()
    }

    iframeWin.addEventListener('afterprint', doCleanup, { once: true })
    window.addEventListener('afterprint', doCleanup, { once: true })

    // Fallback cleanup timer in case afterprint doesn't fire immediately
    setTimeout(() => {
      doCleanup()
    }, 60000)

    try {
      iframeWin.focus()
      iframeWin.print()
    } catch (err) {
      console.error('Iframe window print error:', err)
      doCleanup()
    }
  })
}
