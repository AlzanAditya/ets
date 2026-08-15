import { useState, useEffect, type FC } from 'react'
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Trash2,
  FileText,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PDFPageItem } from '../types'

interface PdfPreviewModalProps {
  isOpen: boolean
  pageIndex: number
  pages: PDFPageItem[]
  onClose: () => void
  onSelectIndex: (index: number) => void
  onDeletePage: (id: string) => void
}

export const PdfPreviewModal: FC<PdfPreviewModalProps> = ({
  isOpen,
  pageIndex,
  pages,
  onClose,
  onSelectIndex,
  onDeletePage,
}) => {
  const [zoom, setZoom] = useState<number>(100)

  // Reset zoom when modal opens or page changes
  useEffect(() => {
    if (isOpen) {
      setZoom(100)
    }
  }, [isOpen, pageIndex])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && pageIndex > 0) {
        onSelectIndex(pageIndex - 1)
      } else if (e.key === 'ArrowRight' && pageIndex < pages.length - 1) {
        onSelectIndex(pageIndex + 1)
      } else if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, pageIndex, pages.length, onSelectIndex, onClose])

  const currentPage = pages[pageIndex]

  if (!isOpen || !currentPage) return null

  const handleZoomIn = () => setZoom((z) => Math.min(250, z + 25))
  const handleZoomOut = () => setZoom((z) => Math.max(50, z - 25))
  const handleResetZoom = () => setZoom(100)

  const handleDeleteCurrent = () => {
    onDeletePage(currentPage.id)
    if (pages.length <= 1) {
      onClose()
    } else if (pageIndex >= pages.length - 1) {
      onSelectIndex(pages.length - 2)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-0 flex flex-col gap-0 overflow-hidden rounded-2xl bg-card border-border shadow-2xl">
        {/* Header Bar */}
        <DialogHeader className="px-4 py-3 border-b border-border/80 flex flex-row items-center justify-between space-y-0 shrink-0 bg-muted/40">
          <div className="flex items-center gap-2">
            <DialogTitle className="text-sm font-bold text-foreground">
              Preview Halaman
            </DialogTitle>
            <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary font-semibold">
              Urutan ke-{pageIndex + 1} dari {pages.length}
            </span>
            <span className="text-xs text-muted-foreground">
              (Asal: Hal. {currentPage.displayPageNumber})
            </span>
          </div>

          {/* Controls: Zoom, Delete, Close */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center bg-background rounded-lg border border-border/60 p-0.5 mr-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handleZoomOut}
                disabled={zoom <= 50}
                title="Zoom Out"
              >
                <ZoomOut className="size-3.5" />
              </Button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="text-xs font-mono px-1.5 text-muted-foreground hover:text-foreground"
                title="Reset Zoom (100%)"
              >
                {zoom}%
              </button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handleZoomIn}
                disabled={zoom >= 250}
                title="Zoom In"
              >
                <ZoomIn className="size-3.5" />
              </Button>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDeleteCurrent}
              className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
            >
              <Trash2 className="size-3.5" />
              <span>Hapus</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Main Content Area */}
        <div className="relative flex-1 bg-muted/30 flex items-center justify-center p-4 overflow-auto">
          {/* Navigation Arrows */}
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={() => onSelectIndex(pageIndex - 1)}
            disabled={pageIndex <= 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 size-10 rounded-full shadow-lg bg-background/90 hover:bg-background disabled:opacity-30 backdrop-blur-xs"
            title="Halaman Sebelumnya (Panah Kiri)"
          >
            <ChevronLeft className="size-5" />
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={() => onSelectIndex(pageIndex + 1)}
            disabled={pageIndex >= pages.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 size-10 rounded-full shadow-lg bg-background/90 hover:bg-background disabled:opacity-30 backdrop-blur-xs"
            title="Halaman Berikutnya (Panah Kanan)"
          >
            <ChevronRight className="size-5" />
          </Button>

          {/* Page Image */}
          <div
            className="transition-transform duration-150 flex items-center justify-center max-w-full max-h-full"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }}
          >
            {currentPage.thumbnailUrl ? (
              <img
                src={currentPage.thumbnailUrl}
                alt={`Preview Halaman ${currentPage.displayPageNumber}`}
                className="max-w-[80vw] max-h-[70vh] object-contain rounded-sm shadow-xl border border-border bg-white"
              />
            ) : (
              <div className="w-[400px] h-[560px] bg-background rounded-lg border border-border flex flex-col items-center justify-center gap-3 text-muted-foreground shadow-lg">
                <FileText className="size-16 stroke-1" />
                <p className="text-sm font-semibold">Halaman {currentPage.displayPageNumber}</p>
                <p className="text-xs text-muted-foreground">{currentPage.width} × {currentPage.height} pt</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2 border-t border-border/80 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground shrink-0">
          <span>Dimensi: {currentPage.width} × {currentPage.height} pt</span>
          <span>Gunakan panah keyboard ← / → untuk berpindah halaman</span>
          <span>Rotasi: {currentPage.rotation || 0}°</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
