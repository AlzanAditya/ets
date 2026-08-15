const DB_NAME = "ets-berita-acara"
const DB_VERSION = 1
const STORE_NAME = "documents"
const DOCUMENT_ID = "current"

export interface BeritaAcaraCache {
  id: typeof DOCUMENT_ID
  fileName: string
  pdfBytes: ArrayBuffer
  pageOrder: number[]
  updatedAt: number
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("Gagal membuka cache PDF."))
  })
}

export async function getCachedBeritaAcara(): Promise<BeritaAcaraCache | null> {
  if (typeof indexedDB === "undefined") return null

  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly")
    const request = transaction.objectStore(STORE_NAME).get(DOCUMENT_ID)

    request.onsuccess = () => resolve((request.result as BeritaAcaraCache | undefined) ?? null)
    request.onerror = () => reject(request.error ?? new Error("Gagal membaca cache PDF."))
    transaction.oncomplete = () => database.close()
    transaction.onerror = () => database.close()
  })
}

export async function saveCachedBeritaAcara(
  fileName: string,
  pdfBytes: ArrayBuffer,
  pageOrder: number[],
): Promise<void> {
  if (typeof indexedDB === "undefined") return

  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite")
    transaction.objectStore(STORE_NAME).put({
      id: DOCUMENT_ID,
      fileName,
      pdfBytes,
      pageOrder,
      updatedAt: Date.now(),
    } satisfies BeritaAcaraCache)

    transaction.oncomplete = () => {
      database.close()
      resolve()
    }
    transaction.onerror = () => {
      database.close()
      reject(transaction.error ?? new Error("Gagal menyimpan cache PDF."))
    }
  })
}

export async function clearCachedBeritaAcara(): Promise<void> {
  if (typeof indexedDB === "undefined") return

  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite")
    transaction.objectStore(STORE_NAME).delete(DOCUMENT_ID)

    transaction.oncomplete = () => {
      database.close()
      resolve()
    }
    transaction.onerror = () => {
      database.close()
      reject(transaction.error ?? new Error("Gagal menghapus cache PDF."))
    }
  })
}
