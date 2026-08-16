import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

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

// Keep individual canvases small enough for mobile Chrome. A PDF page at
// scale=2 can otherwise allocate tens of MB of RGBA memory before encoding.
const MAX_CANVAS_PIXELS = 4_000_000
const MAX_CANVAS_DIMENSION = 2200
const JPEG_QUALITY = 0.88

function getSafeViewport(page: pdfjsLib.PDFPageProxy) {
  const base = page.getViewport({ scale: 1 })
  const basePixels = base.width * base.height

  let scale = Math.min(2, Math.sqrt(MAX_CANVAS_PIXELS / Math.max(basePixels, 1)))
  let viewport = page.getViewport({ scale })

  const largestDimension = Math.max(viewport.width, viewport.height)
  if (largestDimension > MAX_CANVAS_DIMENSION) {
    scale *= MAX_CANVAS_DIMENSION / largestDimension
    viewport = page.getViewport({ scale })
  }

  return viewport
}

/**
 * Streams converted PDF pages one-by-one so completed pages do not need to be
 * kept in memory together with every other rendered canvas.
 */
export async function* streamPdfToImages(
  pdfFile: File,
): AsyncGenerator<ExtractedPdfPage, void, unknown> {
  const arrayBuffer = await pdfFile.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
  const pdfDoc = await loadingTask.promise
  const numPages = pdfDoc.numPages
  const baseName = pdfFile.name.replace(/\.pdf$/i, '')

  try {
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      let page: pdfjsLib.PDFPageProxy | null = null
      let canvas: HTMLCanvasElement | null = null

      try {
        page = await pdfDoc.getPage(pageNum)
        const viewport = getSafeViewport(page)

        canvas = document.createElement('canvas')
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)

        const context = canvas.getContext('2d')
        if (!context) {
          throw new Error('Canvas 2D context is unavailable')
        }

        await page.render({
          canvasContext: context,
          viewport,
          canvas,
        }).promise

        const blob = await new Promise<Blob | null>((resolve) => {
          canvas!.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
        })

        if (!blob) {
          throw new Error(`Failed to encode PDF page ${pageNum}`)
        }

        const fileName = `${baseName}_Hal_${pageNum}.jpg`
        const pageFile = new File([blob], fileName, { type: 'image/jpeg' })
        const previewUrl = URL.createObjectURL(pageFile)

        yield {
          file: pageFile,
          previewUrl,
          name: fileName,
          size: blob.size,
          width: canvas.width,
          height: canvas.height,
          pageNumber: pageNum,
          totalPages: numPages,
          isPdfPage: true,
        }
      } finally {
        try {
          page?.cleanup()
        } catch {
          // Best-effort cleanup; the page is already no longer needed.
        }

        if (canvas) {
          canvas.width = 1
          canvas.height = 1
          canvas.remove()
        }

        page = null
        canvas = null

        // Give the browser a chance to release the previous page's backing
        // store before rendering the next page on memory-constrained phones.
        await new Promise<void>((resolve) => setTimeout(resolve, 0))
      }
    }
  } finally {
    try {
      await pdfDoc.cleanup()
    } catch {
      // Best-effort cleanup.
    }
    try {
      await pdfDoc.destroy()
    } catch {
      // Best-effort cleanup.
    }
    try {
      await loadingTask.destroy()
    } catch {
      // Best-effort cleanup.
    }
  }
}

/**
 * Backwards-compatible helper for callers that still expect a Promise array.
 * Prefer streamPdfToImages() for mobile-sensitive flows.
 */
export async function convertPdfToImages(pdfFile: File): Promise<ExtractedPdfPage[]> {
  const results: ExtractedPdfPage[] = []
  for await (const page of streamPdfToImages(pdfFile)) {
    results.push(page)
  }
  return results
}
