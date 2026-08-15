import { PDFPageItem } from '../types'

const DB_NAME = 'ets_berita_acara_db'
const DB_VERSION = 1
const STORE_NAME = 'working_document'
const DOC_KEY = 'current_pdf_session'

export interface StoredPdfSession {
  key: string
  fileData: ArrayBuffer
  fileName: string
  fileSize: number
  totalPages: number
  pages: PDFPageItem[]
  originalPages: PDFPageItem[]
  deletedPages: PDFPageItem[]
  lastModified: number
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB tidak didukung oleh peramban ini.'))
      return
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }

    request.onsuccess = (event: Event) => {
      resolve((event.target as IDBOpenDBRequest).result)
    }

    request.onerror = () => {
      reject(new Error(`Gagal membuka database IndexedDB: ${request.error?.message || 'Error tidak diketahui'}`))
    }
  })
}

export async function savePdfSessionToStorage(session: Omit<StoredPdfSession, 'key'>): Promise<void> {
  try {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const dataToSave: StoredPdfSession = {
        ...session,
        key: DOC_KEY,
        lastModified: Date.now(),
      }

      const request = store.put(dataToSave)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error(`Gagal menyimpan PDF ke IndexedDB: ${request.error?.message}`))

      tx.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('savePdfSessionToStorage error:', error)
    throw error
  }
}

export async function getPdfSessionFromStorage(): Promise<StoredPdfSession | null> {
  try {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(DOC_KEY)

      request.onsuccess = () => {
        resolve(request.result || null)
      }
      request.onerror = () => reject(new Error(`Gagal membaca PDF dari IndexedDB: ${request.error?.message}`))

      tx.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('getPdfSessionFromStorage error:', error)
    return null
  }
}

export async function updatePagesInStorage(pages: PDFPageItem[], deletedPages: PDFPageItem[] = []): Promise<void> {
  try {
    const existing = await getPdfSessionFromStorage()
    if (!existing) return

    existing.pages = pages
    existing.deletedPages = deletedPages
    existing.lastModified = Date.now()

    await savePdfSessionToStorage(existing)
  } catch (error) {
    console.error('updatePagesInStorage error:', error)
  }
}

export async function clearPdfSessionFromStorage(): Promise<void> {
  try {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.delete(DOC_KEY)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error(`Gagal menghapus PDF dari IndexedDB: ${request.error?.message}`))

      tx.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('clearPdfSessionFromStorage error:', error)
  }
}
