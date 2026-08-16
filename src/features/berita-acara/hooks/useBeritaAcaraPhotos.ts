import { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { BeritaAcaraImage } from '../types'

export function useBeritaAcaraPhotos() {
  const [images, setImages] = useState<BeritaAcaraImage[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  
  // Drag and drop reordering state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Clean up object URLs on unmount
  const imagesRef = useRef<BeritaAcaraImage[]>([])
  imagesRef.current = images

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((img) => {
        if (img.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(img.previewUrl)
        }
      })
    }
  }, [])

  const handleUploadPhotos = useCallback(async (files: File[] | FileList) => {
    const fileList = Array.from(files).filter(
      (f) => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|bmp|avif|heic)$/i.test(f.name)
    )

    if (fileList.length === 0) {
      toast.error('Pilih berkas format foto / gambar (JPG, PNG, WEBP, dll.)')
      return
    }

    setIsUploading(true)
    const toastId = toast.loading(`Memproses ${fileList.length} foto...`)

    try {
      const newItems: BeritaAcaraImage[] = []

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i]
        const previewUrl = URL.createObjectURL(file)

        // Read image dimensions
        let width = 800
        let height = 600

        try {
          const img = new Image()
          await new Promise<void>((resolve) => {
            img.onload = () => {
              width = img.naturalWidth || 800
              height = img.naturalHeight || 600
              resolve()
            }
            img.onerror = () => resolve()
            img.src = previewUrl
          })
        } catch {
          // fallback dimensions
        }

        newItems.push({
          id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          file,
          previewUrl,
          name: file.name,
          size: file.size,
          width,
          height,
          uploadedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          isLoading: false,
        })
      }

      setImages((prev) => [...prev, ...newItems])
      toast.success(`Berhasil menambahkan ${newItems.length} foto dokumentasi`, { id: toastId })
    } catch (err: any) {
      console.error('Error adding photos:', err)
      toast.error(err.message || 'Gagal menambahkan foto', { id: toastId })
    } finally {
      setIsUploading(false)
    }
  }, [])

  const handleDeletePhoto = useCallback((id: string) => {
    setImages((prev) => {
      const target = prev.find((img) => img.id === id)
      if (target && target.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl)
      }
      return prev.filter((img) => img.id !== id)
    })
    toast.success('Foto berhasil dihapus')
  }, [])

  const handleClearAll = useCallback(() => {
    images.forEach((img) => {
      if (img.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(img.previewUrl)
      }
    })
    setImages([])
    setLightboxIndex(null)
    toast.info('Semua foto dibersihkan')
  }, [images])

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
        return reordered
      })
      setDraggedIndex(null)
      toast.success('Urutan foto diperbarui')
    },
    [draggedIndex]
  )

  return {
    images,
    isUploading,
    lightboxIndex,
    draggedIndex,
    handleUploadPhotos,
    handleDeletePhoto,
    handleClearAll,
    handleDragStart,
    handleDragOver,
    handleDrop,
    setLightboxIndex,
  }
}
