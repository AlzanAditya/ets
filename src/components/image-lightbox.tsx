import * as React from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export interface LightboxImage {
  id: string;
  url: string;
  title?: string;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
}

export function ImageLightbox({
  images,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
}: ImageLightboxProps) {
  const [touchStartX, setTouchStartX] = React.useState<number | null>(null);
  const [touchEndX, setTouchEndX] = React.useState<number | null>(null);

  const currentImg = images[currentIndex];

  const handlePrev = React.useCallback(() => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    } else {
      onNavigate(images.length - 1); // Loop around or stop
    }
  }, [currentIndex, images.length, onNavigate]);

  const handleNext = React.useCallback(() => {
    if (currentIndex < images.length - 1) {
      onNavigate(currentIndex + 1);
    } else {
      onNavigate(0); // Loop around
    }
  }, [currentIndex, images.length, onNavigate]);

  // Keyboard navigation
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

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

  if (!isOpen || !currentImg) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md transition-opacity animate-in fade-in-0 duration-200 select-none"
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <div
        className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 to-transparent text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="px-2.5 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/80 text-xs font-mono font-bold text-amber-400">
            {currentIndex + 1} / {images.length}
          </span>
          {currentImg.title && (
            <span className="text-zinc-300 text-xs sm:text-sm font-medium truncate max-w-xs sm:max-w-md">
              {currentImg.title}
            </span>
          )}
        </div>

        <button
          onClick={onClose}
          className="size-9 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 hover:text-white flex items-center justify-center transition-colors shadow-lg"
          aria-label="Tutup preview"
        >
          <X className="size-5" />
        </button>
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
            onClick={handleNext}
            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 size-11 rounded-full bg-black/60 hover:bg-black/90 border border-zinc-700 text-white flex items-center justify-center transition-colors shadow-xl group"
            aria-label="Foto Selanjutnya"
          >
            <ChevronRight className="size-6 transition-transform group-hover:translate-x-0.5" />
          </button>
        )}
      </div>
    </div>
  );
}
