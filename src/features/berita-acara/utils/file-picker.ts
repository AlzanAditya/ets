/**
 * Mobile-safe file picker utilities.
 *
 * The Berita Acara page intentionally uses the standard HTML file input as
 * its primary picker. It is the most interoperable mechanism for Android
 * Chrome's native Gallery / Files dialogs and does not depend on the
 * File System Access API.
 *
 * Important lifecycle rule:
 * - Never use window.focus/blur or a short timeout to decide whether a file
 *   picker has finished. Returning from a native picker is asynchronous and
 *   those events can race with the input's `change` event on mobile.
 * - Resolve on `change` when files are selected and on the input `cancel`
 *   event when the user dismisses the picker.
 */

export interface PickOptions {
  multiple?: boolean
  accept?: string[]
  extensions?: string[]
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

/** Checks whether a file is an image or PDF based on MIME type or extension. */
export function isValidAssetFile(file: File): boolean {
  if (file.type) {
    if (file.type.startsWith('image/')) return true
    if (file.type === 'application/pdf') return true
  }

  const name = file.name.toLowerCase()
  return DEFAULT_IMAGE_EXTS.some((ext) => name.endsWith(ext))
}

function getAcceptValue(acceptType: 'images' | 'pdf' | 'all'): string {
  if (acceptType === 'images') {
    return 'image/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.heic,.heif,.bmp,.svg'
  }

  if (acceptType === 'pdf') {
    return 'application/pdf,.pdf'
  }

  return 'image/*,application/pdf,.pdf'
}

/**
 * Creates a visually-hidden input that is not part of any form.
 * It stays in the DOM only for the lifetime of the picker operation.
 */
function createPickerInput(): HTMLInputElement {
  const input = document.createElement('input')
  input.type = 'file'
  input.tabIndex = -1
  input.setAttribute('aria-hidden', 'true')

  // Do not use display:none. A visually-hidden input is more consistently
  // accepted as a user-initiated file picker by mobile browsers.
  Object.assign(input.style, {
    position: 'fixed',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: '0',
    opacity: '0',
    pointerEvents: 'none',
  })

  document.body.appendChild(input)
  return input
}

/**
 * Opens the native browser file picker and resolves only when the picker
 * actually returns a result or is explicitly cancelled.
 */
function pickWithInput(config: {
  multiple?: boolean
  accept?: string
  directory?: boolean
}): Promise<File[]> {
  return new Promise<File[]>((resolve) => {
    const input = createPickerInput()
    input.multiple = config.multiple !== false

    if (config.accept) {
      input.accept = config.accept
    }

    if (config.directory) {
      // Chromium's directory selection support. The normal file picker is
      // still used; this simply asks it to return the files inside a folder.
      input.setAttribute('webkitdirectory', '')
      input.setAttribute('directory', '')
    }

    let settled = false

    const cleanup = () => {
      input.removeEventListener('change', onChange)
      input.removeEventListener('cancel', onCancel)
      input.remove()
    }

    const finish = (files: File[]) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(files)
    }

    const onChange = () => {
      const files = input.files ? Array.from(input.files) : []
      finish(files)
    }

    const onCancel = () => {
      finish([])
    }

    input.addEventListener('change', onChange)
    input.addEventListener('cancel', onCancel)

    // This click happens synchronously inside the caller's click handler,
    // preserving the browser's user-activation requirement.
    input.click()
  })
}

/**
 * Opens the native file manager for files.
 *
 * The standard input path is deliberate: it avoids browser/platform
 * differences in showOpenFilePicker() and is the same primitive used by the
 * normal web upload flow.
 */
export async function pickFiles(options?: {
  acceptType?: 'images' | 'pdf' | 'all'
  multiple?: boolean
}): Promise<File[]> {
  const acceptType = options?.acceptType || 'all'
  const files = await pickWithInput({
    multiple: options?.multiple !== false,
    accept: getAcceptValue(acceptType),
  })

  return files.filter(isValidAssetFile)
}

/**
 * Opens a native folder picker using Chromium's webkitdirectory input.
 * No focus/blur listener is used, so returning from Android Files cannot race
 * against a synthetic timeout that destroys the input too early.
 */
export async function pickDirectoryFiles(): Promise<File[]> {
  const files = await pickWithInput({
    multiple: true,
    directory: true,
  })

  return files.filter(isValidAssetFile)
}
