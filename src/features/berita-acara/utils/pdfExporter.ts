import { PDFDocument } from 'pdf-lib'

export interface ExportResult {
  blob: Blob
  downloadUrl: string
  fileSize: number
  pageCount: number
}

/**
 * Builds a new lossless PDF document using pdf-lib by extracting and copying the original
 * vector/text/media pages in the exact sequence requested by the user.
 *
 * @param sourceArrayBuffer - The original raw PDF binary data
 * @param pageIndices - Array of 0-based page indices from the source document (e.g. [4, 0, 3, 2] for pages 5, 1, 4, 3)
 * @param outputFileName - Desired file name for download
 */
export async function exportReorderedPdf(
  sourceArrayBuffer: ArrayBuffer,
  pageIndices: number[],
  onProgress?: (percent: number, statusText: string) => void
): Promise<ExportResult> {
  if (!sourceArrayBuffer || sourceArrayBuffer.byteLength === 0) {
    throw new Error('Data sumber PDF tidak valid atau kosong.')
  }

  if (pageIndices.length === 0) {
    throw new Error('Pilih minimal satu halaman untuk diekspor ke dokumen PDF baru.')
  }

  onProgress?.(15, 'Membaca struktur dokumen sumber...')

  // Load source document
  const srcDoc = await PDFDocument.load(sourceArrayBuffer, {
    ignoreEncryption: true,
  })

  onProgress?.(35, 'Membuat dokumen baru & mengalokasikan halaman...')
  const newDoc = await PDFDocument.create()

  // Set standard metadata
  newDoc.setProducer('ETS Berita Acara PDF Organizer')
  newDoc.setCreator('ETS Operations Platform')
  newDoc.setModificationDate(new Date())

  onProgress?.(55, `Menyalin ${pageIndices.length} halaman asli secara lossless...`)

  // Copy specific original pages without rasterizing
  const copiedPages = await newDoc.copyPages(srcDoc, pageIndices)

  onProgress?.(75, 'Menyusun urutan halaman baru...')
  for (const page of copiedPages) {
    newDoc.addPage(page)
  }

  onProgress?.(90, 'Melakukan kompilasi berkas PDF akhir...')
  const pdfBytes = await newDoc.save()

  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
  const downloadUrl = URL.createObjectURL(blob)

  onProgress?.(100, 'Selesai! Berkas PDF siap diunduh.')

  return {
    blob,
    downloadUrl,
    fileSize: blob.size,
    pageCount: pageIndices.length,
  }
}

/**
 * Triggers browser download for a generated Blob.
 */
export function triggerFileDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.style.display = 'none'
  a.href = url
  a.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 1000)
}
