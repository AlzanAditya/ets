/**
 * Lightweight IndexedDB persistence layer for Berita Acara photos.
 * Stores raw Blobs/Files natively (zero memory overhead, no Base64 freezing).
 */

const DB_NAME = 'berita_acara_db'
const DB_VERSION = 2
const STORE_NAME = 'photos'

export interface StoredBeritaAcaraPhoto {
  id: string
  name: string
  size: number
  type: string
  blob: Blob | File
  width: number
  height: number
  uploadedAt: string
  order: number
  isPdfPage?: boolean
  pageNumber?: number
  totalPages?: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported'))
      return
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME)
      }
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      store.createIndex('order', 'order', { unique: false })
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function savePhotosToStorage(photos: StoredBeritaAcaraPhoto[]): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

      const clearReq = store.clear()
      clearReq.onsuccess = () => {
        if (photos.length === 0) {
          resolve()
          return
        }

        let completed = 0
        for (const photo of photos) {
          const addReq = store.put(photo)
          addReq.onsuccess = () => {
            completed++
            if (completed === photos.length) {
              resolve()
            }
          }
          addReq.onerror = () => reject(addReq.error)
        }
      }
      clearReq.onerror = () => reject(clearReq.error)
      transaction.onerror = () => reject(transaction.error)
    })
  } catch (err) {
    console.warn('Failed to save photos to IndexedDB:', err)
  }
}

export async function loadPhotosFromStorage(): Promise<StoredBeritaAcaraPhoto[]> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        const results = (request.result as StoredBeritaAcaraPhoto[]) || []
        results.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        resolve(results)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn('Failed to load photos from IndexedDB:', err)
    return []
  }
}

export async function clearPhotosStorage(): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn('Failed to clear photos from IndexedDB:', err)
  }
}
