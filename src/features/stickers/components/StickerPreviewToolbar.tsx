import React from 'react';
import { PreviewTab } from '../types';
import {
  RectangleHorizontal,
  LayoutGrid,
  Download,
  Printer,
  ChevronDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

interface StickerPreviewToolbarProps {
  activeTab: PreviewTab;
  onTabChange: (tab: PreviewTab) => void;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset?: () => void;
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
  onZoomFit,
  onDownloadPdf,
  onDownloadPdfNative,
  onPrint,
  isGeneratingPdf,
  pdfScale,
}) => {
  return (
    <div className="flex flex-wrap gap-3 items-center justify-between w-full bg-card border border-border p-2.5 rounded-xl shadow-xs text-card-foreground">
      {/* Tab Switcher: Icons only */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted border border-border">
        <button
          type="button"
          onClick={() => onTabChange('single')}
          title="Single Sticker Preview"
          aria-label="Single Sticker Preview"
          className={`p-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
            activeTab === 'single'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <RectangleHorizontal className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => onTabChange('a4')}
          title="A4 Print Layout Preview"
          aria-label="A4 Print Layout Preview"
          className={`p-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
            activeTab === 'a4'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <LayoutGrid className="size-4" />
        </button>
      </div>

      {/* Zoom Controls (Tengah): Terbungkus seperti ButtonGroup dengan separator & latar belakang gelap untuk persen */}
      <div className="inline-flex items-center rounded-lg border border-zinc-700 bg-zinc-900/90 shadow-2xs overflow-hidden divide-x divide-zinc-700 text-xs">
        <button
          type="button"
          onClick={onZoomOut}
          className="h-8 px-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 font-bold transition-all cursor-pointer flex items-center justify-center"
          title="Zoom Out"
        >
          -
        </button>
        <div className="h-8 px-3 flex items-center justify-center bg-zinc-950/90 text-zinc-100 font-mono font-bold min-w-[52px]">
          {zoomLevel}%
        </div>
        <button
          type="button"
          onClick={onZoomIn}
          className="h-8 px-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 font-bold transition-all cursor-pointer flex items-center justify-center"
          title="Zoom In"
        >
          +
        </button>
        <button
          type="button"
          onClick={onZoomFit}
          className="h-8 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 font-semibold transition-all cursor-pointer flex items-center justify-center"
          title="Sesuaikan Layar"
        >
          Fit
        </button>
      </div>

      {/* Action Buttons (Kanan): Neutral Gray ButtonGroup with Download & Dropdown Menu */}
      <div className="inline-flex items-center rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xs overflow-hidden text-xs">
        <button
          type="button"
          onClick={onDownloadPdf}
          disabled={isGeneratingPdf}
          className="h-8 px-3.5 text-xs font-semibold flex items-center cursor-pointer bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white transition-colors disabled:opacity-50"
          title="Unduh PDF (Bitmap)"
        >
          {isGeneratingPdf ? `Menyiapkan (${pdfScale}x)...` : 'Unduh'}
        </button>

        {/* Separator yang sama persis dengan Zoom Controls */}
        <div className="w-px h-8 bg-zinc-700 shrink-0" aria-hidden="true" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={isGeneratingPdf}
              className="h-8 px-2 text-xs cursor-pointer bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-colors disabled:opacity-50"
              aria-label="Opsi Unduh & Cetak"
              title="Pilihan Format Unduh & Cetak"
            >
              <ChevronDown className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem
              onClick={onDownloadPdf}
              className="text-xs font-medium cursor-pointer flex items-center gap-2"
            >
              <Download className="size-3.5 text-muted-foreground" />
              <span>Unduh PDF (Bitmap)</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDownloadPdfNative ?? onDownloadPdf}
              className="text-xs font-medium cursor-pointer flex items-center gap-2"
            >
              <Download className="size-3.5 text-muted-foreground" />
              <span>Unduh PDF (Presisi)</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onPrint}
              className="text-xs font-medium cursor-pointer flex items-center gap-2"
            >
              <Printer className="size-3.5 text-muted-foreground" />
              <span>Cetak PDF A4</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

