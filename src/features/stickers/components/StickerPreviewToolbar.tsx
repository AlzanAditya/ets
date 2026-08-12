import React from 'react';
import { PreviewTab } from '../types';
import { Download, Printer } from 'lucide-react';

interface StickerPreviewToolbarProps {
  activeTab: PreviewTab;
  onTabChange: (tab: PreviewTab) => void;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onZoomFit: () => void;
  onDownloadPdf: () => void;
  onDownloadPdfNative?: () => void;
  onPrint: () => void;
  isGeneratingPdf: boolean;
  pdfScale: number;
}

export const StickerPreviewToolbar: React.FC<StickerPreviewToolbarProps> = ({
  activeTab,
  onTabChange,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onZoomFit,
  onDownloadPdf,
  onDownloadPdfNative,
  onPrint,
  isGeneratingPdf,
  pdfScale,
}) => {
  return (
    <div className="flex flex-wrap gap-3 items-center justify-between w-full bg-card border border-border p-2.5 rounded-xl shadow-xs text-card-foreground">
      {/* Tab Switcher */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted border border-border">
        <button
          type="button"
          onClick={() => onTabChange('single')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'single'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Single Sticker Preview
        </button>
        <button
          type="button"
          onClick={() => onTabChange('a4')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'a4'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          A4 Print Layout Preview
        </button>
      </div>

      {/* Action Buttons: Download PDF & Print */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onDownloadPdf}
          disabled={isGeneratingPdf}
          title="Export cepat format bitmap image"
          className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold text-xs flex items-center gap-2 shadow-xs transition-all border border-primary/30 cursor-pointer"
        >
          <Download className={`size-4 ${isGeneratingPdf ? 'animate-spin' : ''}`} />
          {isGeneratingPdf ? `Menyiapkan PDF (${pdfScale}x)...` : 'Unduh PDF (Cepat - bitmap)'}
        </button>
        {onDownloadPdfNative && (
          <button
            type="button"
            onClick={onDownloadPdfNative}
            disabled={isGeneratingPdf}
            title="Teks bisa diseleksi & dicari. Pilih 'Save as PDF' di dialog cetak browser."
            className="px-3.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-50 text-secondary-foreground font-semibold text-xs flex items-center gap-2 shadow-xs transition-all border border-border cursor-pointer"
          >
            <Printer className="size-4" />
            Unduh PDF (Presisi - bisa diseleksi)
          </button>
        )}
        <button
          type="button"
          onClick={onPrint}
          className="px-3.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground font-semibold text-xs flex items-center gap-2 shadow-xs transition-all border border-border cursor-pointer"
        >
          <Printer className="size-4" />
          Cetak A4
        </button>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-muted-foreground hidden sm:inline font-medium">Zoom:</span>
        <button
          type="button"
          onClick={onZoomOut}
          className="px-2 py-1 rounded-md bg-muted border border-border text-muted-foreground hover:text-foreground font-bold transition-all cursor-pointer"
          title="Zoom Out"
        >
          -
        </button>
        <span className="min-w-[42px] text-center font-bold text-foreground">
          {zoomLevel}%
        </span>
        <button
          type="button"
          onClick={onZoomIn}
          className="px-2 py-1 rounded-md bg-muted border border-border text-muted-foreground hover:text-foreground font-bold transition-all cursor-pointer"
          title="Zoom In"
        >
          +
        </button>
        <button
          type="button"
          onClick={onZoomReset}
          className="px-2.5 py-1 rounded-md bg-muted border border-border text-muted-foreground hover:text-foreground font-semibold transition-all cursor-pointer"
          title="Reset 100%"
        >
          100%
        </button>
        <button
          type="button"
          onClick={onZoomFit}
          className="px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-secondary-foreground font-semibold transition-all cursor-pointer"
          title="Sesuaikan Layar"
        >
          Fit
        </button>
      </div>
    </div>
  );
};
