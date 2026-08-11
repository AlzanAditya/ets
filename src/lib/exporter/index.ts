import { exportDocumentPagesToPdf } from './pdf-exporter'
import { exportDocumentPagesToPptx } from './pptx-exporter'
import { exportDocumentPagesToNativePrint } from '../document-pdf-native-print'
import { ExportDocumentFormat, ExportPdfOptions, ExportPptxOptions } from './types'

export * from './types'
export * from './pdf-exporter'
export * from './pptx-exporter'
export * from '../document-pdf-native-print'

/**
 * Universal document exporter router function supporting PDF, Native Print & PPTX formats.
 */
export async function exportDocument(
  pageElements: HTMLElement[],
  format: ExportDocumentFormat | 'native-print',
  options: ExportPdfOptions & ExportPptxOptions = {}
): Promise<void> {
  if (format === 'pdf') {
    return exportDocumentPagesToPdf(pageElements, options)
  } else if (format === 'native-print') {
    return exportDocumentPagesToNativePrint(pageElements, options)
  } else if (format === 'pptx') {
    return exportDocumentPagesToPptx(pageElements, options)
  } else {
    throw new Error(`Format export '${format}' tidak didukung!`)
  }
}

