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
    <div className="flex flex-wrap gap-3 items-center justify-between w-full bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl shadow-sm">
      {/* Tab Switcher */}
      <div className="flex gap-1 p-1 rounded-lg bg-slate-950 border border-slate-800">
        <button
          type="button"
          onClick={() => onTabChange('single')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'single'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Single Sticker Preview
        </button>
        <button
          type="button"
          onClick={() => onTabChange('a4')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'a4'
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
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
          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-all border border-emerald-500/30 cursor-pointer"
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
            className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-all border border-sky-500/30 cursor-pointer"
          >
            <Printer className="size-4" />
            Unduh PDF (Presisi - bisa diseleksi)
          </button>
        )}
        <button
          type="button"
          onClick={onPrint}
          className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-all border border-blue-500/30 cursor-pointer"
        >
          <Printer className="size-4" />
          Cetak A4
        </button>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-slate-400 hidden sm:inline font-medium">Zoom:</span>
        <button
          type="button"
          onClick={onZoomOut}
          className="px-2 py-1 rounded-md bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white font-bold transition-all cursor-pointer"
          title="Zoom Out"
        >
          -
        </button>
        <span className="min-w-[42px] text-center font-bold text-slate-200">
          {zoomLevel}%
        </span>
        <button
          type="button"
          onClick={onZoomIn}
          className="px-2 py-1 rounded-md bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white font-bold transition-all cursor-pointer"
          title="Zoom In"
        >
          +
        </button>
        <button
          type="button"
          onClick={onZoomReset}
          className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white font-semibold transition-all cursor-pointer"
          title="Reset 100%"
        >
          100%
        </button>
        <button
          type="button"
          onClick={onZoomFit}
          className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all cursor-pointer"
          title="Sesuaikan Layar"
        >
          Fit
        </button>
      </div>
    </div>
  );
};
