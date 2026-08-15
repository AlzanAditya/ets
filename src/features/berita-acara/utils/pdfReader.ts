import { PDFDocument } from 'pdf-lib'
import { PDFPageItem } from '../types'
import { initPdfWorker } from './pdfWorkerSetup'

export interface ReadPdfResult {
  fileData: ArrayBuffer
  fileName: string
  fileSize: number
  totalPages: number
  pages: PDFPageItem[]
}

/**
 * Loads a PDF file, parses page metadata with pdf-lib, and renders high-quality page thumbnails with pdfjs-dist.
 */
export async function readPdfFile(
  file: File | Blob,
  fileName: string,
  onProgress?: (current: number, total: number, message: string) => void
): Promise<ReadPdfResult> {
  onProgress?.(0, 0, 'Membaca berkas PDF...')

  const rawArrayBuffer = await file.arrayBuffer()
  if (!rawArrayBuffer || rawArrayBuffer.byteLength === 0) {
    throw new Error('Berkas PDF kosong atau rusak (0 bytes).')
  }

  // Clone buffer so PDF.js worker transfer does not neuter/detach our source buffer
  const sourceBufferForApp = rawArrayBuffer.slice(0)
  const sourceBufferForPdfLib = rawArrayBuffer.slice(0)
  const sourceBufferForPdfJs = rawArrayBuffer.slice(0)

  onProgress?.(0, 0, 'Memverifikasi struktur dokumen...')

  // 1. Verify structure and extract metadata using pdf-lib (100% reliable in JS thread)
  let totalPages = 0
  const pageMetaList: { width: number; height: number; rotation: number }[] = []

  try {
    const pdfLibDoc = await PDFDocument.load(sourceBufferForPdfLib, {
      ignoreEncryption: true,
    })
    totalPages = pdfLibDoc.getPageCount()

    for (let i = 0; i < totalPages; i++) {
      try {
        const page = pdfLibDoc.getPage(i)
        const size = page.getSize()
        const rotation = page.getRotation().angle || 0
        pageMetaList.push({
          width: Math.round(size.width),
          height: Math.round(size.height),
          rotation,
        })
      } catch {
        pageMetaList.push({ width: 595, height: 842, rotation: 0 })
      }
    }
  } catch (pdfLibErr: any) {
    console.warn('pdf-lib validation note:', pdfLibErr)
    if (pdfLibErr?.message?.includes('Password') || pdfLibErr?.message?.includes('encrypted')) {
      throw new Error('PDF dilindungi kata sandi. Silakan buka proteksi sandi dokumen terlebih dahulu.')
    }
  }

  // 2. Try loading with PDF.js for rendering visual page thumbnails
  let pdfJsDoc: any = null
  try {
    const pdfjs = initPdfWorker()
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(sourceBufferForPdfJs),
      cMapUrl: 'https://unpkg.com/pdfjs-dist@6.2.108/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@6.2.108/standard_fonts/',
    })
    pdfJsDoc = await loadingTask.promise
    if (!totalPages || totalPages === 0) {
      totalPages = pdfJsDoc.numPages
    }
  } catch (pdfJsErr) {
    console.warn('PDF.js getDocument initialization notice:', pdfJsErr)
  }

  if (totalPages === 0) {
    throw new Error('Format file bukan dokumen PDF standar yang valid atau halaman tidak ditemukan.')
  }

  const pages: PDFPageItem[] = []

  // 3. Render each page thumbnail
  for (let i = 1; i <= totalPages; i++) {
    onProgress?.(i, totalPages, `Merender thumbnail halaman ${i} dari ${totalPages}...`)

    const defaultMeta = pageMetaList[i - 1] || { width: 595, height: 842, rotation: 0 }
    let thumbnailUrl: string | undefined = undefined
    let pageWidth = defaultMeta.width
    let pageHeight = defaultMeta.height
    let pageRotation = defaultMeta.rotation

    if (pdfJsDoc) {
      try {
        const page = await pdfJsDoc.getPage(i)
        const viewport = page.getViewport({ scale: 1.0 })
        pageWidth = Math.round(viewport.width)
        pageHeight = Math.round(viewport.height)
        pageRotation = viewport.rotation || 0

        // Target thumbnail width around 320px
        const targetWidth = 320
        const scale = Math.max(0.2, targetWidth / viewport.width)
        const thumbViewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d', { alpha: false })

        if (ctx) {
          canvas.width = thumbViewport.width
          canvas.height = thumbViewport.height

          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)

          const renderContext = {
            canvasContext: ctx,
            viewport: thumbViewport,
            canvas,
          }

          await (page.render(renderContext as any) as any).promise
          thumbnailUrl = canvas.toDataURL('image/jpeg', 0.85)
        }

        // Cleanup page resources if available
        if (typeof page.cleanup === 'function') {
          page.cleanup()
        }
      } catch (pageRenderErr) {
        console.warn(`Thumbnail rendering fallback for page ${i}:`, pageRenderErr)
      }
    }

    pages.push({
      id: `page-orig-${i - 1}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      originalIndex: i - 1, // 0-based
      displayPageNumber: i, // 1-based original
      thumbnailUrl,
      width: pageWidth,
      height: pageHeight,
      rotation: pageRotation,
    })
  }

  onProgress?.(totalPages, totalPages, 'Selesai membaca dokumen PDF.')

  return {
    fileData: sourceBufferForApp,
    fileName,
    fileSize: file.size || sourceBufferForApp.byteLength,
    totalPages,
    pages,
  }
}

