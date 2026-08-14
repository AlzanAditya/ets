import * as React from "react";
import { X, ChevronLeft, ChevronRight, Trash2, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export interface LightboxImage {
  id: string;
  url: string;
  title?: string;
  storage_path?: string;
  thumbnail_path?: string | null;
  eventId?: string;
  stepId?: string;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
  canDelete?: boolean;
  onDelete?: (image: LightboxImage, index: number) => Promise<void> | void;
}

export function ImageLightbox({
  images,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
  canDelete = false,
  onDelete,
}: ImageLightboxProps) {
  const [touchStartX, setTouchStartX] = React.useState<number | null>(null);
  const [touchEndX, setTouchEndX] = React.useState<number | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const currentImg = images[currentIndex];

  const handlePrev = React.useCallback(() => {
    if (images.length <= 1) return;
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    } else {
      onNavigate(images.length - 1); // Loop around
    }
  }, [currentIndex, images.length, onNavigate]);

  const handleNext = React.useCallback(() => {
    if (images.length <= 1) return;
    if (currentIndex < images.length - 1) {
      onNavigate(currentIndex + 1);
    } else {
      onNavigate(0); // Loop around
    }
  }, [currentIndex, images.length, onNavigate]);

  // Keyboard navigation
  React.useEffect(() => {
    if (!isOpen || confirmDeleteOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, confirmDeleteOpen, onClose, handlePrev, handleNext]);

  // Touch gesture handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
  };

  const handleConfirmDelete = async () => {
    if (!currentImg || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(currentImg, currentIndex);
      setConfirmDeleteOpen(false);
      if (images.length <= 1) {
        onClose();
      } else if (currentIndex >= images.length - 1) {
        onNavigate(Math.max(0, images.length - 2));
      }
    } catch (err) {
      console.error("Lightbox delete error:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || !currentImg) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md transition-opacity animate-in fade-in-0 duration-200 select-none"
        onClick={onClose}
      >
        {/* Top Header Bar */}
        <div
          className="absolute top-0 left-0 right-0 p-3 sm:p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/90 via-black/50 to-transparent text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="px-2.5 py-1 rounded-full bg-zinc-800/90 border border-zinc-700/80 text-xs font-mono font-bold text-amber-400 shrink-0">
              {currentIndex + 1} / {images.length}
            </span>
            {currentImg.title && (
              <span className="text-zinc-300 text-xs sm:text-sm font-medium truncate max-w-[180px] sm:max-w-md">
                {currentImg.title}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Delete button inside lightbox */}
            {canDelete && onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isDeleting}
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDeleteOpen(true);
                }}
                className="h-9 px-3 rounded-full bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 gap-1.5 transition-colors text-xs font-semibold"
                title="Hapus foto ini"
              >
                {isDeleting ? (
                  <Loader2 className="size-4 animate-spin text-white" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                <span className="hidden sm:inline">Hapus</span>
              </Button>
            )}

            {/* Close Lightbox button */}
            <button
              type="button"
              onClick={onClose}
              className="size-9 rounded-full bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 hover:text-white flex items-center justify-center transition-colors shadow-lg border border-zinc-700/60"
              aria-label="Tutup preview"
              title="Tutup preview"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Main Image View */}
        <div
          className="relative w-full h-full flex items-center justify-center p-4 sm:p-12 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={currentImg.url}
            alt={currentImg.title || `Foto ${currentIndex + 1}`}
            className="max-h-[85vh] max-w-[95vw] object-contain rounded-lg shadow-2xl transition-all duration-300"
          />

          {/* Previous Button */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 size-11 rounded-full bg-black/60 hover:bg-black/90 border border-zinc-700 text-white flex items-center justify-center transition-colors shadow-xl group"
              aria-label="Foto Sebelumnya"
            >
              <ChevronLeft className="size-6 transition-transform group-hover:-translate-x-0.5" />
            </button>
          )}

          {/* Next Button */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 size-11 rounded-full bg-black/60 hover:bg-black/90 border border-zinc-700 text-white flex items-center justify-center transition-colors shadow-xl group"
              aria-label="Foto Selanjutnya"
            >
              <ChevronRight className="size-6 transition-transform group-hover:translate-x-0.5" />
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Dialog for Image Deletion inside Lightbox */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent className="max-w-sm rounded-2xl bg-zinc-950 border-zinc-800 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg text-zinc-100">Hapus foto ini?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm text-zinc-400">
              Foto yang dihapus akan dihilangkan secara permanen dari penyimpanan dan database. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel
              disabled={isDeleting}
              className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-xl text-xs sm:text-sm"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs sm:text-sm gap-1.5"
            >
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              <span>{isDeleting ? "Menghapus..." : "Hapus Foto"}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
