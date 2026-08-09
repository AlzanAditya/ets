import { exportDocumentPagesToPdf } from '@/lib/document-pdf-exporter'

export async function exportA4PagesToPDF(
  containerElement: HTMLElement,
  pdfScale: number,
  fileNamePrefix: string,
  copiesCount: number
): Promise<void> {
  const pageNodes = containerElement.querySelectorAll<HTMLElement>('.a4-page')
  if (!pageNodes || !pageNodes.length) {
    throw new Error('Tidak ada halaman A4 yang dapat dibuat PDF!')
  }

  const pageElements = Array.from(pageNodes)
  const selectedScale = parseInt(String(pdfScale), 10) || 3
  const safeName = (fileNamePrefix || 'ETS_Sticker').replace(/[^a-zA-Z0-9]/g, '_')
  const fileName = `ETS_Stickers_${safeName}_${copiesCount}pcs.pdf`

  await exportDocumentPagesToPdf(pageElements, {
    orientation: 'portrait',
    widthMm: 210,
    heightMm: 297,
    widthPx: 794,
    heightPx: 1123,
    scale: selectedScale,
    filename: fileName,
  })
}
