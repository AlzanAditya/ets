import React from 'react'
import {
  UploadCloud,
  Plus,
  Loader2,
  X,
  GripVertical,
  Download,
  Trash2,
  Images,
} from 'lucide-react'
import { ImageLightbox, LightboxImage } from '@/components/image-lightbox'
import { Button } from '@/components/ui/button'
import { BeritaAcaraImage } from '../types'

interface BeritaAcaraPhotoGalleryProps {
  images: BeritaAcaraImage[]
  isUploading: boolean
  lightboxIndex: number | null
  onUpload: (files: FileList | File[]) => void
  onDelete: (id: string) => void
  onClearAll: () => void
  onDragStart: (index: number) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (index: number) => void
  onSetLightboxIndex: (index: number | null) => void
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function BeritaAcaraPhotoGallery({
  images,
  isUploading,
  lightboxIndex,
  onUpload,
  onDelete,
  onClearAll,
  onDragStart,
  onDragOver,
  onDrop,
  onSetLightboxIndex,
}: BeritaAcaraPhotoGalleryProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [isDragOverDropzone, setIsDragOverDropzone] = React.useState(false)

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files)
    }
    e.target.value = ''
  }

  const handleDropzoneDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOverDropzone(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files)
    }
  }

  // Convert to LightboxImage format for the full-screen lightbox
  const lightboxImages: LightboxImage[] = images.map((img, i) => ({
    id: img.id,
    url: img.previewUrl,
    title: `Foto ${i + 1}: ${img.name} (${img.width}×${img.height})`,
  }))

  const handleDownloadAll = () => {
    images.forEach((img, i) => {
      const a = document.createElement('a')
      a.href = img.previewUrl
      a.download = img.name || `foto-berita-acara-${i + 1}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    })
  }

  return (
    <div className="space-y-6">
      {/* Hidden File Input supporting all image types & multiple selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Main Card Container (Style matched with product event accordion) */}
      <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden shadow-lg">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 bg-muted/40 border-b border-border/70">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-2xs">
              <Images className="size-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <span>Galeri Foto Berita Acara</span>
                <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-mono font-bold border border-primary/20">
                  {images.length} Foto
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Tarik foto untuk mengatur urutan atau klik untuk memperbesar (Lightbox).
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {images.length > 0 && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadAll}
                  className="rounded-xl text-xs gap-1.5 h-8 border-border"
                >
                  <Download className="size-3.5" />
                  <span className="hidden sm:inline">Unduh Semua</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClearAll}
                  className="rounded-xl text-xs gap-1.5 h-8 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-3.5" />
                  <span className="hidden sm:inline">Bersihkan</span>
                </Button>
              </>
            )}

            <Button
              type="button"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl text-xs font-semibold gap-1.5 h-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
            >
              {isUploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              <span>Tambah Foto</span>
            </Button>
          </div>
        </div>

        {/* Gallery Grid Section */}
        <div className="p-4 sm:p-6 space-y-4">
          {images.length === 0 ? (
            /* Empty State / Dropzone */
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragOverDropzone(true)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                setIsDragOverDropzone(false)
              }}
              onDrop={handleDropzoneDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center p-8 sm:p-12 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center select-none ${
                isDragOverDropzone
                  ? 'border-primary bg-primary/10 scale-[1.01]'
                  : 'border-border/80 bg-background/50 hover:bg-background/80 hover:border-primary/50'
              }`}
            >
              <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3.5 shadow-2xs">
                {isUploading ? (
                  <Loader2 className="size-7 animate-spin" />
                ) : (
                  <UploadCloud className="size-7" />
                )}
              </div>
              <h4 className="text-sm font-semibold text-foreground mb-1">
                {isUploading ? 'Sedang Memproses Foto...' : 'Unggah Foto Dokumentasi'}
              </h4>
              <p className="text-xs text-muted-foreground max-w-sm mb-4">
                Pilih atau seret foto (PNG, JPG, WEBP, HEIC, dll.). Anda dapat memilih banyak foto sekaligus.
              </p>
              <Button
                type="button"
                size="sm"
                className="rounded-xl px-4 text-xs font-semibold"
                disabled={isUploading}
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
              >
                Pilih Foto
              </Button>
            </div>
          ) : (
            /* Grid of Images (4 cols on mobile, 4-6 on desktop like product event accordion) */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  draggable
                  onDragStart={() => onDragStart(idx)}
                  onDragOver={onDragOver}
                  onDrop={() => onDrop(idx)}
                  onClick={() => onSetLightboxIndex(idx)}
                  className="group relative aspect-[3/4] sm:aspect-square rounded-xl border border-border/80 bg-background overflow-hidden shadow-xs transition-all hover:border-primary/60 hover:shadow-md cursor-pointer"
                >
                  {/* Image Display */}
                  <img
                    src={img.previewUrl}
                    alt={img.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />

                  {/* Drag Grip Handle */}
                  <div
                    className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 p-1 rounded-md text-white cursor-grab active:cursor-grabbing backdrop-blur-xs"
                    onClick={(e) => e.stopPropagation()}
                    title="Tarik untuk memindahkan urutan"
                  >
                    <GripVertical className="size-3.5" />
                  </div>

                  {/* Top-Right Index Pill */}
                  <div className="absolute top-1.5 right-1.5 opacity-90 sm:group-hover:opacity-0 transition-opacity bg-black/60 px-1.5 py-0.5 rounded text-[10px] font-mono text-white font-semibold">
                    #{idx + 1}
                  </div>

                  {/* Delete Photo Button (like product event button) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(img.id)
                    }}
                    className="absolute top-1.5 right-1.5 z-10 size-6 flex items-center justify-center rounded-full bg-black/80 hover:bg-rose-600 active:scale-90 text-white shadow-md border border-white/20 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Hapus foto"
                    aria-label="Hapus foto"
                  >
                    <X className="size-3.5 stroke-[2.5]" />
                  </button>

                  {/* Bottom Info Bar Overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[11px] font-medium truncate">{img.name}</p>
                    <p className="text-[9px] text-zinc-300">
                      {formatBytes(img.size)} · {img.width}×{img.height}
                    </p>
                  </div>
                </div>
              ))}

              {/* Quick "+ Upload" Tile (like product event accordion) */}
              <label className="group relative aspect-[3/4] sm:aspect-square rounded-xl border-2 border-dashed border-border/80 hover:border-primary/60 bg-muted/20 hover:bg-muted/50 flex flex-col items-center justify-center cursor-pointer transition-all">
                {isUploading ? (
                  <Loader2 className="size-6 animate-spin text-primary" />
                ) : (
                  <>
                    <div className="size-9 rounded-xl bg-primary/10 text-primary group-hover:scale-110 flex items-center justify-center transition-all mb-1">
                      <Plus className="size-5" />
                    </div>
                    <span className="text-xs font-semibold text-foreground/80 group-hover:text-primary transition-colors">
                      Tambah Foto
                    </span>
                    <span className="text-[10px] text-muted-foreground">Multi-upload</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  disabled={isUploading}
                  onChange={handleFileInputChange}
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox / Zoom Modal (using the standard application ImageLightbox) */}
      {lightboxIndex !== null && (
        <ImageLightbox
          images={lightboxImages}
          currentIndex={lightboxIndex}
          isOpen={lightboxIndex !== null}
          onClose={() => onSetLightboxIndex(null)}
          onNavigate={(newIdx) => onSetLightboxIndex(newIdx)}
          canDelete={true}
          onDelete={(_, idx) => {
            const target = images[idx]
            if (target) {
              onDelete(target.id)
            }
          }}
        />
      )}
    </div>
  )
}
