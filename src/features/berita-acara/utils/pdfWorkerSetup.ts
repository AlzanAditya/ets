import * as pdfjsLib from 'pdfjs-dist'
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker'

// Polyfill Promise.withResolvers if not natively present in the browser runtime (required by PDF.js v4+/v6+)
if (typeof (Promise as any).withResolvers === 'undefined') {
  if (typeof window !== 'undefined') {
    ;(Promise as any).withResolvers = function <T>() {
      let resolve!: (value: T | PromiseLike<T>) => void
      let reject!: (reason?: any) => void
      const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
      })
      return { promise, resolve, reject }
    }
  }
}

let isInitialized = false

/**
 * Initializes and configures pdfjs-dist worker for Vite development and production builds.
 */
export function initPdfWorker(): typeof pdfjsLib {
  if (isInitialized) {
    return pdfjsLib
  }

  if (typeof window !== 'undefined') {
    try {
      // 1. Primary Vite worker constructor (100% offline, zero network 404s, works in iframes)
      pdfjsLib.GlobalWorkerOptions.workerPort = new (PdfWorker as any)()
    } catch (workerPortErr) {
      console.warn('Failed to initialize workerPort, falling back to CDN worker URL:', workerPortErr)
      const version = pdfjsLib.version || '6.2.108'
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`
    }
    isInitialized = true
  }

  return pdfjsLib
}

export { pdfjsLib }


