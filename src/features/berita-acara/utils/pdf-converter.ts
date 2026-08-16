import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Set worker source URL for Vite client-side bundle
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker
}

export interface ExtractedPdfPage {
  file: File
  previewUrl: string
  name: string
  size: number
  width: number
  height: number
  pageNumber: number
  totalPages: number
  isPdfPage: boolean
}

/**
 * Converts each page of a PDF file into a high-resolution image (Blob).
 */
export async function convertPdfToImages(pdfFile: File): Promise<ExtractedPdfPage[]> {
  try {
    const arrayBuffer = await pdfFile.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdfDoc = await loadingTask.promise
    const numPages = pdfDoc.numPages
    const results: ExtractedPdfPage[] = []

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum)
      // Scale 2.0 gives crisp 150-300 DPI text & photo quality
      const viewport = page.getViewport({ scale: 2.0 })
      
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) continue

      canvas.width = viewport.width
      canvas.height = viewport.height

      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      }).promise

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92)
      })

      if (!blob) continue

      const baseName = pdfFile.name.replace(/\.pdf$/i, '')
      const fileName = `${baseName}_Hal_${pageNum}.jpg`
      const pageFile = new File([blob], fileName, { type: 'image/jpeg' })
      const previewUrl = URL.createObjectURL(pageFile)

      results.push({
        file: pageFile,
        previewUrl,
        name: fileName,
        size: blob.size,
        width: Math.round(viewport.width),
        height: Math.round(viewport.height),
        pageNumber: pageNum,
        totalPages: numPages,
        isPdfPage: true,
      })
    }

    return results
  } catch (error) {
    console.error('Failed to convert PDF to images:', error)
    throw error
  }
}
