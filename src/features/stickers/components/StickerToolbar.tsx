import React from "react";
import type { StickerTabMode } from "@/types/sticker";
import {
  RotateCcw,
  Zap,
  Download,
  Printer,
  PackageCheck,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2,
} from "lucide-react";

interface StickerToolbarProps {
  activeTab: StickerTabMode;
  onTabChange: (tab: StickerTabMode) => void;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onZoomFit: () => void;
  isRandomizing: boolean;
  onToggleRandomize: () => void;
  randomSpeedMs: number;
  onChangeSpeedMs: (speedMs: number) => void;
  onResetData: () => void;
  onExportPDF: () => void;
  onPrint: () => void;
  onOpenProductDialog: () => void;
  isPdfLoading?: boolean;
  selectedProductsCount?: number;
}

export const StickerToolbar: React.FC<StickerToolbarProps> = ({
  activeTab,
  onTabChange,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onZoomFit,
  isRandomizing,
  onToggleRandomize,
  randomSpeedMs,
  onChangeSpeedMs,
  onResetData,
  onExportPDF,
  onPrint,
  onOpenProductDialog,
  isPdfLoading = false,
  selectedProductsCount = 0,
}) => {
  return (
    <div className="space-y-3 no-print">
      {/* Top Main Actions Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 bg-card border border-border/70 rounded-xl shadow-xs">
        {/* Title / Info */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <PackageCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-foreground">
                ETS Sticker Generator
              </h1>
              {selectedProductsCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                  {selectedProductsCount} Produk Dipilih
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Generator & Layout Cetak Stiker A4 untuk Produk Electricity Treatment System
            </p>
          </div>
        </div>

        {/* Action Button Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Admin Product Picker Button */}
          <button
            type="button"
            onClick={onOpenProductDialog}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <PackageCheck className="h-4 w-4" />
            <span>Pilih Produk</span>
          </button>

          {/* Reset */}
          <button
            type="button"
            onClick={onResetData}
            title="Reset ke Default"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* Live Demo Randomizer Control Box */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-background/80 border border-border rounded-lg text-xs">
            <button
              type="button"
              onClick={onToggleRandomize}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isRandomizing
                  ? "bg-red-600 text-white animate-pulse shadow-md"
                  : "bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-black"
              }`}
            >
              <Zap className="h-3.5 w-3.5 fill-current" />
              <span>{isRandomizing ? "Stop Demo" : `Live Demo (${randomSpeedMs}ms)`}</span>
            </button>

            <div className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground">
              {[50, 100, 250, 500, 1000].map((ms) => (
                <button
                  key={ms}
                  type="button"
                  onClick={() => onChangeSpeedMs(ms)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
                    randomSpeedMs === ms
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/40 hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {ms}ms
                </button>
              ))}
            </div>
          </div>

          {/* Download PDF A4 */}
          <button
            type="button"
            onClick={onExportPDF}
            disabled={isPdfLoading}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            {isPdfLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>Unduh PDF A4</span>
          </button>

          {/* Print A4 */}
          <button
            type="button"
            onClick={onPrint}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Printer className="h-4 w-4" />
            <span>Cetak A4</span>
          </button>
        </div>
      </div>

      {/* View Tabs & Zoom Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2 bg-card/60 border border-border/60 rounded-xl">
        {/* Tab Buttons */}
        <div className="inline-flex items-center p-1 bg-background border border-border/80 rounded-lg w-full sm:w-auto">
          <button
            type="button"
            onClick={() => onTabChange("single")}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === "single"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Single Sticker Preview
          </button>
          <button
            type="button"
            onClick={() => onTabChange("a4")}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === "a4"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            A4 Print Layout Preview
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground w-full sm:w-auto justify-end">
          <span className="font-medium mr-1 hidden sm:inline">Zoom:</span>
          <button
            type="button"
            onClick={onZoomOut}
            title="Zoom Out"
            className="p-1.5 rounded bg-background border border-border hover:bg-accent text-foreground transition-all"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="w-12 text-center font-bold text-foreground font-mono">
            {zoomLevel}%
          </span>
          <button
            type="button"
            onClick={onZoomIn}
            title="Zoom In"
            className="p-1.5 rounded bg-background border border-border hover:bg-accent text-foreground transition-all"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onZoomReset}
            title="Reset 100%"
            className="px-2 py-1 rounded bg-background border border-border hover:bg-accent text-foreground font-semibold text-[11px] transition-all"
          >
            100%
          </button>
          <button
            type="button"
            onClick={onZoomFit}
            title="Fit ke Layar"
            className="px-2.5 py-1 rounded bg-primary/10 border border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground font-semibold text-[11px] transition-all flex items-center gap-1"
          >
            <Maximize2 className="h-3 w-3" />
            <span>Fit</span>
          </button>
        </div>
      </div>
    </div>
  );
};
