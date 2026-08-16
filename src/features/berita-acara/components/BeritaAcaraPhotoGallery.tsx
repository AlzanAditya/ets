import React from 'react'
import {
  FolderOpen,
  FolderTree,
  Plus,
  Loader2,
  X,
  GripVertical,
  Download,
  Trash2,
  Images,
  ImageIcon,
  FileText,
  CheckCircle2,
  FileDown,
  UploadCloud,
} from 'lucide-react'
import { ImageLightbox, LightboxImage } from '@/components/image-lightbox'
import { Button } from '@/components/ui/button'
import { BeritaAcaraImage } from '../types'

interface BeritaAcaraPhotoGalleryProps {
  images: BeritaAcaraImage[]
  isUploading: boolean
  isExportingPdf?: boolean
  isInitialized?: boolean
  lightboxIndex: number | null
  onUpload: (files: FileList | File[]) => void
  onPickGallery: () => void
  onPickPdf: () => void
  onPickStorage: () => void
  onPickFolder: () => void
  onDelete: (id: string) => void
  onClearAll: () => void
  onDragStart: (index: number) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (index: number) => void
  onSetLightboxIndex: (index: number | null) => void
  onExportPdf?: () => void
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
  isExportingPdf = false,
  isInitialized = true,
  lightboxIndex,
  onUpload,
  onPickGallery,
  onPickPdf,
  onPickStorage,
  onPickFolder,
  onDelete,
  onClearAll,
  onDragStart,
  onDragOver,
  onDrop,
  onSetLightboxIndex,
  onExportPdf,
}: BeritaAcaraPhotoGalleryProps) {
  const [isDragOverDropzone, setIsDragOverDropzone] = React.useState(false)

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
    title: img.isPdfPage
      ? `Halaman PDF ${img.pageNumber}/${img.totalPages}: ${img.name}`
      : `Foto ${i + 1}: ${img.name} (${img.width}×${img.height})`,
  }))

  const handleDownloadAll = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
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
      {/* Main Card Container */}
      <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden shadow-lg">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 bg-muted/40 border-b border-border/70">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-2xs">
              <Images className="size-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <span>Galeri Foto & Dokumen Berita Acara</span>
                <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-mono font-bold border border-primary/20">
                  {images.length} Lembar
                </span>
              </h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                <span>Penyimpanan otomatis aktif. File picker dioptimalkan untuk perangkat mobile.</span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {images.length > 0 && (
              <>
                {onExportPdf && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isExportingPdf || isUploading}
                    onClick={(e) => {
                      e.preventDefault()
                      onExportPdf()
                    }}
                    className="rounded-xl text-xs gap-1.5 h-8 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
                    title="Unduh semua foto dalam dokumen PDF format A4 Berita Acara"
                  >
                    {isExportingPdf ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <FileDown className="size-3.5" />
                    )}
                    <span>Unduh PDF A4</span>
                  </Button>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadAll}
                  className="rounded-xl text-xs gap-1.5 h-8 border-border cursor-pointer"
                >
                  <Download className="size-3.5" />
                  <span className="hidden sm:inline">Unduh Semua</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault()
                    onClearAll()
                  }}
                  className="rounded-xl text-xs gap-1.5 h-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                  <span className="hidden sm:inline">Bersihkan</span>
                </Button>
              </>
            )}

            {/* OPSI 1: Galeri Foto Langsung (Dialog Galeri) */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onPickGallery()
              }}
              className="rounded-xl text-xs font-semibold gap-1.5 h-8 border-border bg-background hover:bg-muted text-foreground cursor-pointer"
              title="Buka Dialog Galeri Foto Perangkat"
            >
              <ImageIcon className="size-3.5 text-blue-500" />
              <span>Dialog Galeri</span>
            </Button>

            {/* OPSI 2: Dokumen PDF */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onPickPdf()
              }}
              className="rounded-xl text-xs font-semibold gap-1.5 h-8 border-border bg-background hover:bg-muted text-foreground cursor-pointer"
              title="Pilih Berkas PDF"
            >
              <FileText className="size-3.5 text-rose-500" />
              <span className="hidden sm:inline">Dokumen PDF</span>
            </Button>

            {/* OPSI 3: Tambah / Buka Penyimpanan (File Manager) */}
            <Button
              type="button"
              size="sm"
              disabled={isUploading}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onPickStorage()
              }}
              className="rounded-xl text-xs font-semibold gap-1.5 h-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
              title="Buka Penyimpanan (File Manager)"
            >
              {isUploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <FolderOpen className="size-3.5" />
              )}
              <span>Penyimpanan</span>
            </Button>
          </div>
        </div>

        {/* Gallery Grid Section */}
        <div className="p-4 sm:p-6 space-y-4">
          {!isInitialized ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : images.length === 0 ? (
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
              className={`flex flex-col items-center justify-center p-8 sm:p-12 rounded-xl border-2 border-dashed transition-all text-center select-none ${
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
                {isUploading ? 'Sedang Memproses & Mengekstrak Berkas...' : 'Unggah Foto atau Dokumen PDF'}
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mb-5">
                Pilih langsung dari dialog galeri, penyimpanan berkas, atau unggah dokumen PDF untuk diekstrak otomatis.
              </p>
              
              {/* Four Testing Options with preventDefault & Direct Async Handlers */}
              <div className="flex items-center gap-2.5 flex-wrap justify-center">
                {/* 1. Dialog Galeri Langsung */}
                <Button
                  type="button"
                  size="sm"
                  disabled={isUploading}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onPickGallery()
                  }}
                  className="rounded-xl px-4 text-xs font-semibold gap-2 shadow-xs cursor-pointer"
                >
                  <ImageIcon className="size-4 text-blue-200" />
                  <span>Buka Dialog Galeri</span>
                </Button>

                {/* 2. Berkas PDF */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onPickPdf()
                  }}
                  className="rounded-xl px-4 text-xs font-semibold gap-2 border-border cursor-pointer shadow-xs"
                >
                  <FileText className="size-4 text-rose-500" />
                  <span>Pilih Dokumen PDF</span>
                </Button>

                {/* 3. Penyimpanan / File Manager */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onPickStorage()
                  }}
                  className="rounded-xl px-4 text-xs font-semibold gap-2 border-border cursor-pointer shadow-xs"
                >
                  <FolderOpen className="size-4 text-amber-500" />
                  <span>Penyimpanan (File Manager)</span>
                </Button>

                {/* 4. Satu Folder Utuh */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onPickFolder()
                  }}
                  className="rounded-xl px-4 text-xs font-semibold gap-2 border-border cursor-pointer shadow-xs"
                >
                  <FolderTree className="size-4 text-emerald-500" />
                  <span>1 Folder Utuh</span>
                </Button>
              </div>
            </div>
          ) : (
            /* Grid of Images */
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

                  {/* PDF Badge or Index Pill */}
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10">
                    {img.isPdfPage && (
                      <div className="bg-rose-600/90 text-white px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-tight shadow-xs">
                        PDF {img.pageNumber}/{img.totalPages}
                      </div>
                    )}
                    <div className="bg-black/60 px-1.5 py-0.5 rounded text-[10px] font-mono text-white font-semibold group-hover:opacity-0 transition-opacity">
                      #{idx + 1}
                    </div>
                  </div>

                  {/* Delete Photo Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onDelete(img.id)
                    }}
                    className="absolute top-1.5 right-1.5 z-20 size-6 flex items-center justify-center rounded-full bg-black/80 hover:bg-rose-600 active:scale-90 text-white shadow-md border border-white/20 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Hapus foto"
                    aria-label="Hapus foto"
                  >
                    <X className="size-3.5 stroke-[2.5]" />
                  </button>

                  {/* Bottom Info Bar Overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[11px] font-medium truncate">{img.name}</p>
                    <p className="text-[9px] text-zinc-300">
                      {formatBytes(img.size)} {img.width ? `· ${img.width}×${img.height}` : ''}
                    </p>
                  </div>
                </div>
              ))}

              {/* Quick "+ Tambah Foto / PDF / Galeri" Action Tile */}
              <div className="group relative aspect-[3/4] sm:aspect-square rounded-xl border-2 border-dashed border-border/80 hover:border-primary/60 bg-muted/20 hover:bg-muted/50 flex flex-col items-center justify-center transition-all text-center p-2">
                {isUploading ? (
                  <Loader2 className="size-6 animate-spin text-primary" />
                ) : (
                  <div className="flex flex-col items-center gap-1.5 w-full">
                    {/* Option: Dialog Galeri */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onPickGallery()
                      }}
                      className="w-full flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-semibold transition-colors cursor-pointer"
                      title="Buka Dialog Galeri"
                    >
                      <ImageIcon className="size-3.5 text-blue-500" />
                      <span>Dialog Galeri</span>
                    </button>

                    {/* Option: PDF */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onPickPdf()
                      }}
                      className="w-full flex items-center justify-center gap-1 py-1 px-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground text-[10px] font-medium transition-colors cursor-pointer"
                      title="Buka Dokumen PDF"
                    >
                      <FileText className="size-3 text-rose-500" />
                      <span>Dokumen PDF</span>
                    </button>

                    {/* Option: Penyimpanan */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onPickStorage()
                      }}
                      className="w-full flex items-center justify-center gap-1 py-1 px-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground text-[10px] font-medium transition-colors cursor-pointer"
                      title="Buka Penyimpanan (File Manager)"
                    >
                      <Plus className="size-3" />
                      <span>Penyimpanan</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox / Zoom Modal */}
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
