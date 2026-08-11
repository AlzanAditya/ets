import { renderPageElementToCanvas } from './pdf-exporter'
import { ExportPptxOptions } from './types'

export { renderPageElementToCanvas }

/**
 * Export pre-rendered bitmap image data URLs to a PowerPoint (.pptx) presentation.
 */
export async function exportDocumentBitmapsToPptx(
  bitmaps: string[],
  options: ExportPptxOptions = {}
): Promise<void> {
  if (!bitmaps || !bitmaps.length) {
    throw new Error('Tidak ada image/bitmap untuk diexport ke PPTX!')
  }

  const PptxGenJS = (await import('pptxgenjs')).default
  const pptx = new PptxGenJS()

  const orientation = options.orientation || 'landscape'
  if (options.layout) {
    pptx.layout = options.layout
  } else if (orientation === 'portrait') {
    pptx.layout = 'LAYOUT_4x3'
  } else {
    pptx.layout = 'LAYOUT_WIDE'
  }

  pptx.author = options.author || 'ETS Report Builder'
  pptx.subject = options.subject || 'Document'
  pptx.title = options.title || 'Document'
  pptx.company = options.company || 'ETS'

  const slideWidth = options.slideWidthInches || (orientation === 'landscape' ? 13.333333 : 7.5)
  const slideHeight = options.slideHeightInches || (orientation === 'landscape' ? 7.5 : 10)

  bitmaps.forEach((image) => {
    const slide = pptx.addSlide()
    slide.addImage({ data: image, x: 0, y: 0, w: slideWidth, h: slideHeight })
  })

  const filename = options.filename || 'Document.pptx'
  await pptx.writeFile({
    fileName: filename,
    compression: true,
  })
}

/**
 * Universal PPTX exporter function for all document DOM elements (Reports, Surveys, Stickers, etc.)
 */
export async function exportDocumentPagesToPptx(
  pageElements: HTMLElement[],
  options: ExportPptxOptions = {}
): Promise<void> {
  if (!pageElements || !pageElements.length) {
    throw new Error('Tidak ada halaman dokumen yang dapat diexport ke PPTX!')
  }

  const orientation = options.orientation || 'landscape'
  const widthPx = options.widthPx || (orientation === 'landscape' ? 1600 : 794)
  const heightPx = options.heightPx || (orientation === 'landscape' ? 900 : 1123)
  const scale = options.scale || 2
  const jpegQuality = options.jpegQuality || 0.95

  const bitmaps: string[] = []
  for (const pageEl of pageElements) {
    const canvas = await renderPageElementToCanvas(pageEl, {
      width: widthPx,
      height: heightPx,
      scale,
      backgroundColor: options.backgroundColor || '#ffffff',
    })
    bitmaps.push(canvas.toDataURL('image/jpeg', jpegQuality))
    canvas.width = 1
    canvas.height = 1
  }

  await exportDocumentBitmapsToPptx(bitmaps, options)
}
