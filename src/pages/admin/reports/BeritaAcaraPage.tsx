import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Images } from 'lucide-react'
import { PageContent } from '@/components/page-content'
import { Button } from '@/components/ui/button'
import {
  useBeritaAcaraPhotos,
  BeritaAcaraPhotoGallery,
} from '@/features/berita-acara'

export default function BeritaAcaraPage() {
  const navigate = useNavigate()
  const {
    images,
    isUploading,
    isExportingPdf,
    isInitialized,
    lightboxIndex,
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
  } = useBeritaAcaraPhotos()

  return (
    <PageContent
      title="Berita Acara — Dokumentasi Foto"
      eyebrow="Dokumen & Operasional"
      description="Unggah, susun urutan, dan pratinjau foto dokumentasi Berita Acara secara instan."
    >
      <div className="space-y-6 pb-12">
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate('/reports')}
            className="rounded-xl gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ChevronLeft className="size-4" />
            <span>Kembali ke Daftar Laporan</span>
          </Button>

          {images.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-3 py-1 rounded-full border border-border">
              <Images className="size-3.5 text-primary" />
              <span>{images.length} Lembar Siap</span>
            </div>
          )}
        </div>

        {/* Photo Gallery Component with modern zero-reload File System Access */}
        <BeritaAcaraPhotoGallery
          images={images}
          isUploading={isUploading}
          isExportingPdf={isExportingPdf}
          isInitialized={isInitialized}
          lightboxIndex={lightboxIndex}
          onUpload={handleUploadPhotos}
          onPickGallery={handlePickGallery}
          onPickPdf={handlePickPdf}
          onPickStorage={handlePickStorage}
          onPickFolder={handlePickFolder}
          onDelete={handleDeletePhoto}
          onClearAll={handleClearAll}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onSetLightboxIndex={setLightboxIndex}
          onExportPdf={handleExportPdf}
        />
      </div>
    </PageContent>
  )
}
