import { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { BeritaAcaraImage } from '../types'
import {
  savePhotosToStorage,
  loadPhotosFromStorage,
  clearPhotosStorage,
  StoredBeritaAcaraPhoto,
} from '../utils/storage'
import { convertPdfToImages } from '../utils/pdf-converter'
import { exportBeritaAcaraToPdf } from '../utils/pdf-exporter'
import { pickFiles, pickDirectoryFiles, isValidAssetFile } from '../utils/file-picker'

function isPdfFile(file: File): boolean {
  if (file.type === 'application/pdf') return true
  return file.name.toLowerCase().endsWith('.pdf')
}

export function useBeritaAcaraPhotos() {
  const [images, setImages] = useState<BeritaAcaraImage[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const activeUrlsRef = useRef<Set<string>>(new Set())

  // Helper to persist images to IndexedDB
  const persistImages = useCallback(async (currentImages: BeritaAcaraImage[]) => {
    try {
      const records: StoredBeritaAcaraPhoto[] = currentImages.map((img, idx) => ({
        id: img.id,
        name: img.name,
        size: img.size,
        type: img.file.type || 'image/jpeg',
        blob: img.file,
        width: img.width,
        height: img.height,
        uploadedAt: img.uploadedAt,
        order: idx,
        isPdfPage: img.isPdfPage,
        pageNumber: img.pageNumber,
        totalPages: img.totalPages,
      }))
      await savePhotosToStorage(records)
    } catch (err) {
      console.warn('Error saving to storage:', err)
    }
  }, [])

  // 1. Initial Load from Persistent IndexedDB on mount
  useEffect(() => {
    let isMounted = true
    async function loadSavedData() {
      try {
        const stored = await loadPhotosFromStorage()
        if (!isMounted) return

        if (stored && stored.length > 0) {
          const loadedImages: BeritaAcaraImage[] = stored.map((item) => {
            const file = item.blob instanceof File ? item.blob : new File([item.blob], item.name, { type: item.type })
            const previewUrl = URL.createObjectURL(file)
            activeUrlsRef.current.add(previewUrl)

            return {
              id: item.id,
              file,
              previewUrl,
              name: item.name,
              size: item.size,
              width: item.width || 800,
              height: item.height || 600,
              uploadedAt: item.uploadedAt,
              isLoading: false,
              isPdfPage: item.isPdfPage,
              pageNumber: item.pageNumber,
              totalPages: item.totalPages,
            }
          })
          setImages(loadedImages)
        }
      } catch (err) {
        console.warn('Could not restore photos from IndexedDB:', err)
      } finally {
        if (isMounted) {
          setIsInitialized(true)
        }
      }
    }

    loadSavedData()
    return () => {
      isMounted = false
      // Cleanup object URLs
      activeUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      activeUrlsRef.current.clear()
    }
  }, [])

  // Process a list of File objects with PDF extraction and zero main-thread block
  const handleUploadPhotos = useCallback(
    async (files: File[] | FileList) => {
      const rawList = Array.from(files).filter(isValidAssetFile)
      if (rawList.length === 0) return

      setIsUploading(true)

      try {
        const newItems: BeritaAcaraImage[] = []
        let pdfPagesExtracted = 0

        for (let i = 0; i < rawList.length; i++) {
          const file = rawList[i]

          if (isPdfFile(file)) {
            // Process PDF file: convert all pages to high-res images
            try {
              toast.info(`Mengekstrak halaman dari ${file.name}...`)
              const pdfPages = await convertPdfToImages(file)
              
              for (const page of pdfPages) {
                activeUrlsRef.current.add(page.previewUrl)
                newItems.push({
                  id: `pdf-${Date.now()}-${i}-${page.pageNumber}-${Math.random().toString(36).substring(2, 6)}`,
                  file: page.file,
                  previewUrl: page.previewUrl,
                  name: page.name,
                  size: page.size,
                  width: page.width,
                  height: page.height,
                  uploadedAt: new Date().toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                  isLoading: false,
                  isPdfPage: true,
                  pageNumber: page.pageNumber,
                  totalPages: page.totalPages,
                })
                pdfPagesExtracted++
              }
            } catch (pdfErr) {
              console.error('Error extracting PDF pages:', pdfErr)
              toast.error(`Gagal membaca PDF ${file.name}`)
            }
          } else {
            // Standard image file
            const previewUrl = URL.createObjectURL(file)
            activeUrlsRef.current.add(previewUrl)

            newItems.push({
              id: `img-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
              file,
              previewUrl,
              name: file.name,
              size: file.size,
              width: 800,
              height: 600,
              uploadedAt: new Date().toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              }),
              isLoading: false,
            })
          }
        }

        if (newItems.length === 0) {
          toast.error('Tidak ada berkas foto atau dokumen PDF yang valid.')
          return
        }

        setImages((prev) => {
          const updated = [...prev, ...newItems]
          persistImages(updated)
          return updated
        })

        if (pdfPagesExtracted > 0) {
          toast.success(`Berhasil menambahkan ${newItems.length} foto (${pdfPagesExtracted} halaman PDF diekstrak)`)
        } else {
          toast.success(`Berhasil menambahkan ${newItems.length} foto`)
        }
      } catch (err: any) {
        console.error('Error adding files:', err)
        toast.error('Gagal menambahkan berkas')
      } finally {
        setIsUploading(false)
      }
    },
    [persistImages]
  )

  // Direct modern File System Access pickers (Zero reload, Promise-based)
  const handlePickGallery = useCallback(async () => {
    try {
      const files = await pickFiles({ acceptType: 'images', multiple: true })
      if (files && files.length > 0) {
        await handleUploadPhotos(files)
      }
    } catch (e) {
      console.warn('Pick gallery error:', e)
    }
  }, [handleUploadPhotos])

  const handlePickPdf = useCallback(async () => {
    try {
      const files = await pickFiles({ acceptType: 'pdf', multiple: true })
      if (files && files.length > 0) {
        await handleUploadPhotos(files)
      }
    } catch (e) {
      console.warn('Pick PDF error:', e)
    }
  }, [handleUploadPhotos])

  const handlePickStorage = useCallback(async () => {
    try {
      const files = await pickFiles({ acceptType: 'all', multiple: true })
      if (files && files.length > 0) {
        await handleUploadPhotos(files)
      }
    } catch (e) {
      console.warn('Pick storage error:', e)
    }
  }, [handleUploadPhotos])

  const handlePickFolder = useCallback(async () => {
    try {
      const files = await pickDirectoryFiles()
      if (files && files.length > 0) {
        await handleUploadPhotos(files)
      }
    } catch (e) {
      console.warn('Pick directory folder error:', e)
    }
  }, [handleUploadPhotos])

  const handleDeletePhoto = useCallback(
    (id: string) => {
      setImages((prev) => {
        const target = prev.find((img) => img.id === id)
        if (target && target.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(target.previewUrl)
          activeUrlsRef.current.delete(target.previewUrl)
        }
        const updated = prev.filter((img) => img.id !== id)
        persistImages(updated)
        return updated
      })
      toast.success('Foto berhasil dihapus')
    },
    [persistImages]
  )

  const handleClearAll = useCallback(async () => {
    activeUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    activeUrlsRef.current.clear()
    setImages([])
    setLightboxIndex(null)
    await clearPhotosStorage()
    toast.info('Semua foto dibersihkan')
  }, [])

  // Drag and drop reordering
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback(
    (dropIndex: number) => {
      if (draggedIndex === null || draggedIndex === dropIndex) {
        setDraggedIndex(null)
        return
      }

      setImages((prev) => {
        const reordered = [...prev]
        const [moved] = reordered.splice(draggedIndex, 1)
        reordered.splice(dropIndex, 0, moved)
        persistImages(reordered)
        return reordered
      })
      setDraggedIndex(null)
      toast.success('Urutan foto diperbarui')
    },
    [draggedIndex, persistImages]
  )

  // Export to Berita Acara PDF Document
  const handleExportPdf = useCallback(async () => {
    if (images.length === 0) {
      toast.error('Tidak ada foto untuk diekspor ke PDF')
      return
    }

    setIsExportingPdf(true)
    try {
      toast.info('Sedang membuat dokumen PDF Berita Acara...')
      await exportBeritaAcaraToPdf(images)
      toast.success('Dokumen PDF berhasil diunduh!')
    } catch (err) {
      console.error('Error generating PDF:', err)
      toast.error('Gagal membuat dokumen PDF')
    } finally {
      setIsExportingPdf(false)
    }
  }, [images])

  return {
    images,
    isUploading,
    isExportingPdf,
    isInitialized,
    lightboxIndex,
    draggedIndex,
    handleUploadPhotos,
    handlePickGallery,
    handlePickPdf,
    handlePickStorage,
    handlePickFolder,
    handleDeletePhoto,
    handleClearAll,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleExportPdf,
    setLightboxIndex,
  }
}
