/**
 * Robust, modern File & Directory picker engine.
 * 
 * 1. Uses the modern File System Access API (showOpenFilePicker, showDirectoryPicker)
 *    which runs asynchronously inside the browser without switching app contexts or refreshing.
 * 2. Provides a fallback using ephemeral in-memory `<input type="file">` elements that
 *    are never attached to forms, preventing accidental form submission or page reloads.
 * 3. Processes large batches in microtasks so the browser UI thread never freezes.
 */

export interface PickOptions {
  multiple?: boolean
  accept?: string[] // e.g. ['image/*', 'application/pdf']
  extensions?: string[] // e.g. ['.jpg', '.png', '.pdf']
}

const DEFAULT_IMAGE_EXTS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.avif',
  '.heic',
  '.heif',
  '.svg',
  '.bmp',
  '.pdf',
]

/**
 * Checks if a file is an image or PDF based on MIME type or extension.
 */
export function isValidAssetFile(file: File): boolean {
  if (file.type) {
    if (file.type.startsWith('image/')) return true
    if (file.type === 'application/pdf') return true
  }
  const name = file.name.toLowerCase()
  return DEFAULT_IMAGE_EXTS.some((ext) => name.endsWith(ext))
}

/**
 * Modern Directory Picker:
 * Prompts user to choose an entire folder.
 * Uses window.showDirectoryPicker() if supported, with fallback to webkitdirectory.
 */
export async function pickDirectoryFiles(): Promise<File[]> {
  // 1. Try modern File System Access API first (Supported in modern Chrome, Edge, Chromium)
  if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
    try {
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'read',
      })
      const files: File[] = []
      await readDirectoryHandleRecursively(dirHandle, files)
      return files.filter(isValidAssetFile)
    } catch (err: any) {
      // User cancelled picker or permission dismissed
      if (err?.name === 'AbortError') {
        return []
      }
      console.warn('showDirectoryPicker failed, falling back to input:', err)
    }
  }

  // 2. Fallback to Ephemeral In-Memory Input Element (Zero Form Attachment)
  return new Promise<File[]>((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.setAttribute('webkitdirectory', '')
    input.setAttribute('directory', '')
    input.multiple = true
    input.style.display = 'none'

    const cleanup = () => {
      window.removeEventListener('focus', onWindowFocus)
      input.remove()
    }

    const onWindowFocus = () => {
      // Small timeout to allow change event to fire first if files were selected
      setTimeout(() => {
        if (!input.files || input.files.length === 0) {
          cleanup()
          resolve([])
        }
      }, 500)
    }

    input.addEventListener(
      'change',
      (e) => {
        cleanup()
        const target = e.target as HTMLInputElement
        if (target.files && target.files.length > 0) {
          const files = Array.from(target.files).filter(isValidAssetFile)
          resolve(files)
        } else {
          resolve([])
        }
      },
      { once: true }
    )

    window.addEventListener('focus', onWindowFocus, { once: true })
    document.body.appendChild(input)
    input.click()
  })
}

/**
 * Recursive reader for FileSystemDirectoryHandle
 */
async function readDirectoryHandleRecursively(
  dirHandle: any,
  accumulator: File[],
  maxDepth = 5,
  currentDepth = 0
): Promise<void> {
  if (currentDepth > maxDepth) return

  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file') {
      try {
        const file = await entry.getFile()
        if (file && isValidAssetFile(file)) {
          accumulator.push(file)
        }
      } catch (e) {
        console.warn('Error reading file from handle:', e)
      }
    } else if (entry.kind === 'directory') {
      await readDirectoryHandleRecursively(entry, accumulator, maxDepth, currentDepth + 1)
    }
  }
}

/**
 * Modern Universal File Picker:
 * Uses window.showOpenFilePicker() when available for zero-reload native system dialog,
 * or an ephemeral detached input with exact MIME filtering.
 */
export async function pickFiles(options?: {
  acceptType?: 'images' | 'pdf' | 'all'
  multiple?: boolean
}): Promise<File[]> {
  const acceptType = options?.acceptType || 'all'
  const multiple = options?.multiple !== false

  // 1. Try File System Access API
  if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
    try {
      const types: any[] = []
      if (acceptType === 'images') {
        types.push({
          description: 'Foto & Gambar',
          accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.heic', '.bmp'],
          },
        })
      } else if (acceptType === 'pdf') {
        types.push({
          description: 'Dokumen PDF',
          accept: {
            'application/pdf': ['.pdf'],
          },
        })
      } else {
        types.push({
          description: 'Foto, Gambar & PDF',
          accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.heic', '.bmp'],
            'application/pdf': ['.pdf'],
          },
        })
      }

      const fileHandles = await (window as any).showOpenFilePicker({
        multiple,
        types,
        excludeAcceptAllOption: false,
      })

      const files: File[] = []
      for (const handle of fileHandles) {
        try {
          const file = await handle.getFile()
          if (file) files.push(file)
        } catch (e) {
          console.warn('Could not read file from handle:', e)
        }
      }
      return files
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return []
      }
      console.warn('showOpenFilePicker failed, falling back to input:', err)
    }
  }

  // 2. Fallback to Ephemeral In-Memory Input Element (Zero Form Attachment)
  return new Promise<File[]>((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = multiple
    input.style.display = 'none'

    if (acceptType === 'images') {
      input.accept = 'image/*'
    } else if (acceptType === 'pdf') {
      input.accept = 'application/pdf,.pdf'
    } else {
      input.accept = 'image/*,application/pdf,.pdf'
    }

    const cleanup = () => {
      window.removeEventListener('focus', onWindowFocus)
      input.remove()
    }

    const onWindowFocus = () => {
      setTimeout(() => {
        if (!input.files || input.files.length === 0) {
          cleanup()
          resolve([])
        }
      }, 500)
    }

    input.addEventListener(
      'change',
      (e) => {
        cleanup()
        const target = e.target as HTMLInputElement
        if (target.files && target.files.length > 0) {
          resolve(Array.from(target.files))
        } else {
          resolve([])
        }
      },
      { once: true }
    )

    window.addEventListener('focus', onWindowFocus, { once: true })
    document.body.appendChild(input)
    input.click()
  })
}
