export interface PrintTemplateOptions {
  pageWidth: string
  pageHeight: string
  pageSize: string
  title?: string
}

/**
 * Builds a completely isolated HTML print document.
 * Only the supplied document pages are placed in the print body; the ETS
 * application shell never enters this document.
 */
export function buildIsolatedPrintDocument(
  pageHtml: string,
  stylesHtml: string,
  options: PrintTemplateOptions
): string {
  const title = options.title || 'ETS Document'

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  ${stylesHtml}
  <style>
    @page {
      size: ${options.pageSize};
      margin: 0;
    }

    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: ${options.pageWidth} !important;
      min-width: ${options.pageWidth} !important;
      background: #ffffff !important;
      color: #000000 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      overflow: visible !important;
    }

    .native-print-page {
      width: ${options.pageWidth} !important;
      height: ${options.pageHeight} !important;
      max-width: none !important;
      max-height: none !important;
      min-width: 0 !important;
      min-height: 0 !important;
      margin: 0 !important;
      box-shadow: none !important;
      transform: none !important;
      position: relative !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
      page-break-after: always !important;
      break-after: page !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .native-print-page:last-child {
      page-break-after: auto !important;
      break-after: auto !important;
    }

    .pdf-ui-only,
    .page-indicator,
    .template-badge,
    .a4-page-badge,
    .render-scale-control,
    .no-print {
      display: none !important;
    }

    @media screen {
      html,
      body {
        width: ${options.pageWidth};
        min-width: ${options.pageWidth};
        background: #ffffff;
      }
    }
  </style>
</head>
<body>
  ${pageHtml}
</body>
</html>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Copy the styles currently loaded by the ETS application into the isolated
 * print document. Styles are copied, but the application DOM is not.
 */
export function collectPrintStyles(): string {
  const parts: string[] = []

  document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach((link) => {
    const href = link.href
    if (!href) return
    parts.push(`<link rel="stylesheet" href="${escapeAttribute(href)}" />`)
  })

  document.querySelectorAll<HTMLStyleElement>('style').forEach((style) => {
    if (!style.textContent) return
    parts.push(`<style>${style.textContent}</style>`)
  })

  return parts.join('\n')
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/\"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
