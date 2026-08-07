import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type {
  StickerItem,
  StickerGeometry,
  A4LayoutSettings,
  StickerTabMode,
  StickerPreset,
} from "@/types/sticker";
import { calculateA4Layout } from "@/features/stickers/utils/layout-calculator";
import {
  generateRandomStickerItem,
  generateRandomSerial,
} from "@/features/stickers/utils/randomizer-data";
import { exportA4PagesToPDF } from "@/features/stickers/utils/pdf-exporter";

import { EtsSticker } from "@/features/stickers/components/EtsSticker";
import { A4PrintLayout } from "@/features/stickers/components/A4PrintLayout";
import { StickerFormPanel } from "@/features/stickers/components/StickerFormPanel";
import { StickerToolbar } from "@/features/stickers/components/StickerToolbar";
import { ProductSelectDialog } from "@/features/stickers/components/ProductSelectDialog";

import "@/features/stickers/styles/sticker.css";
import { ChevronLeft, ChevronRight, Layers, Trash2 } from "lucide-react";

const PRESETS: StickerPreset[] = [
  { width: 100, height: 50, label: "100 × 50 mm" },
  { width: 120, height: 50, label: "120 × 50 mm" },
  { width: 110, height: 50, label: "110 × 50 mm" },
  { width: 80, height: 50, label: "80 × 50 mm" },
];

const DEFAULT_ITEM: StickerItem = {
  productName: "ETS-5.000.AIZ",
  serialNo: "XSI-II512-B-5000-1-0004",
  capacity: "5000 VA / 5 KVA",
  prodNo: "B312D-00004",
  voltage: "AC 220V",
  frequency: "50 Hz",
  model: "AIZ",
};

const DEFAULT_GEOMETRY: StickerGeometry = {
  widthMm: 100,
  heightMm: 50,
};

const DEFAULT_SETTINGS: A4LayoutSettings = {
  marginMm: 5,
  hGapMm: 2,
  vGapMm: 2,
  copies: 20,
  pdfScale: 3,
};

const STORAGE_KEY = "ets_sticker_generator_cache_v1";

interface StickerPageCache {
  item?: StickerItem;
  geometry?: StickerGeometry;
  settings?: A4LayoutSettings;
  queueItems?: StickerItem[];
  activeQueueIdx?: number;
  activeTab?: StickerTabMode;
  zoomLevel?: number;
  randomSpeedMs?: number;
}

function loadCachedData(): StickerPageCache {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Gagal membaca cache stiker:", e);
  }
  return {};
}

export default function StickersPage() {
  const [cached] = useState<StickerPageCache>(() => loadCachedData());

  const [activeTab, setActiveTab] = useState<StickerTabMode>(
    cached.activeTab || "single"
  );
  const [item, setItem] = useState<StickerItem>(
    cached.item || DEFAULT_ITEM
  );
  const [geometry, setGeometry] = useState<StickerGeometry>(
    cached.geometry || DEFAULT_GEOMETRY
  );
  const [settings, setSettings] = useState<A4LayoutSettings>(
    cached.settings || DEFAULT_SETTINGS
  );
  
  // Multi-product selected queue
  const [queueItems, setQueueItems] = useState<StickerItem[]>(
    cached.queueItems || []
  );
  const [activeQueueIdx, setActiveQueueIdx] = useState<number>(() => {
    const idx = cached.activeQueueIdx ?? 0;
    const maxIdx = Math.max(0, (cached.queueItems?.length || 1) - 1);
    return Math.min(idx, maxIdx);
  });

  // Zoom & View
  const [zoomLevel, setZoomLevel] = useState<number>(
    cached.zoomLevel || 100
  );

  // Live Demo Randomize Engine
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [randomSpeedMs, setRandomSpeedMs] = useState<number>(
    cached.randomSpeedMs || 1000
  );

  // Auto-save to localStorage on state changes
  useEffect(() => {
    try {
      const cacheData: StickerPageCache = {
        item,
        geometry,
        settings,
        queueItems,
        activeQueueIdx,
        activeTab,
        zoomLevel,
        randomSpeedMs,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheData));
    } catch (e) {
      console.error("Gagal menyimpan cache stiker ke localStorage:", e);
    }
  }, [
    item,
    geometry,
    settings,
    queueItems,
    activeQueueIdx,
    activeTab,
    zoomLevel,
    randomSpeedMs,
  ]);

  // Product Selection Dialog state
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Live Demo Interval
  useEffect(() => {
    let timer: any = null;
    if (isRandomizing) {
      timer = setInterval(() => {
        if (queueItems.length > 0) {
          // Randomize serial number for current active item or random item
          setItem((prev) => ({
            ...prev,
            serialNo: generateRandomSerial(),
          }));
        } else {
          setItem(generateRandomStickerItem());
        }
      }, randomSpeedMs);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRandomizing, randomSpeedMs, queueItems.length]);

  // When active item in queue changes, sync to form
  useEffect(() => {
    if (queueItems.length > 0 && queueItems[activeQueueIdx]) {
      setItem(queueItems[activeQueueIdx]);
    }
  }, [activeQueueIdx, queueItems]);

  // Handle selected products from dialog
  const handleSelectProducts = (selectedList: StickerItem[]) => {
    if (selectedList.length === 0) return;
    setQueueItems(selectedList);
    setActiveQueueIdx(0);
    setItem(selectedList[0]);
    // Auto set copies count equal or greater
    setSettings((prev) => ({
      ...prev,
      copies: Math.max(prev.copies, selectedList.length),
    }));
  };

  const clearQueue = () => {
    setQueueItems([]);
    setItem(DEFAULT_ITEM);
  };

  // Determine items list for A4 rendering
  const a4Items = useMemo(() => {
    if (queueItems.length > 0) {
      // Repeat queue items if copies > queueItems.length
      const list: StickerItem[] = [];
      while (list.length < settings.copies) {
        for (const q of queueItems) {
          list.push(q);
          if (list.length >= settings.copies) break;
        }
      }
      return list;
    }
    // Single item repeated `settings.copies` times
    return Array.from({ length: settings.copies }, () => item);
  }, [queueItems, item, settings.copies]);

  // Calculate A4 statistics
  const stats = useMemo(() => {
    return calculateA4Layout(settings, geometry, a4Items.length);
  }, [settings, geometry, a4Items.length]);

  // Zoom Helpers
  const handleZoomIn = () => setZoomLevel((z) => Math.min(200, z + 10));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(30, z - 10));
  const handleZoomReset = () => setZoomLevel(100);

  const handleZoomFit = useCallback(() => {
    if (!wrapperRef.current) return;
    const wrapperWidth = wrapperRef.current.clientWidth - 32;
    if (wrapperWidth <= 0) return;

    if (activeTab === "single") {
      // 1mm = ~3.78px
      const stickerPxWidth = geometry.widthMm * 3.78;
      let fit = Math.floor((wrapperWidth / stickerPxWidth) * 100);
      setZoomLevel(Math.min(150, Math.max(40, fit)));
    } else {
      // A4 width = 210mm (~794px)
      const a4PxWidth = 210 * 3.78;
      let fit = Math.floor((wrapperWidth / a4PxWidth) * 100);
      setZoomLevel(Math.min(120, Math.max(30, fit)));
    }
  }, [activeTab, geometry.widthMm]);

  // Auto-fit on tab change
  useEffect(() => {
    handleZoomFit();
  }, [activeTab, handleZoomFit]);

  // Reset Data
  const handleResetData = () => {
    setItem(DEFAULT_ITEM);
    setGeometry(DEFAULT_GEOMETRY);
    setSettings(DEFAULT_SETTINGS);
    setQueueItems([]);
    setActiveQueueIdx(0);
    setActiveTab("single");
    setZoomLevel(100);
    setIsRandomizing(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("Gagal menghapus cache stiker:", e);
    }
  };

  // Export PDF using html2pdf
  const handleExportPDF = async () => {
    setIsPdfLoading(true);
    try {
      const initialTab = activeTab;
      if (activeTab !== "a4") {
        setActiveTab("a4");
        await new Promise((res) => setTimeout(res, 350));
      }
      await exportA4PagesToPDF(
        "#a4-pages-container",
        `Sticker_ETS_${item.model || "Product"}_${item.serialNo || "SN"}`,
        settings.pdfScale
      );
      if (initialTab !== "a4") {
        setActiveTab(initialTab);
      }
    } catch (err: any) {
      console.error("Gagal mengekspor PDF:", err);
      alert("Gagal membuat PDF: " + (err?.message || err));
    } finally {
      setIsPdfLoading(false);
    }
  };

  // Print A4
  const handlePrint = () => {
    if (activeTab !== "a4") {
      setActiveTab("a4");
      setTimeout(() => {
        window.print();
      }, 200);
    } else {
      window.print();
    }
  };

  return (
    <div className="flex-1 p-4 md:p-6 space-y-4 max-w-[1600px] mx-auto w-full">
      {/* Top Toolbar */}
      <StickerToolbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        zoomLevel={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onZoomFit={handleZoomFit}
        isRandomizing={isRandomizing}
        onToggleRandomize={() => setIsRandomizing((prev) => !prev)}
        randomSpeedMs={randomSpeedMs}
        onChangeSpeedMs={setRandomSpeedMs}
        onResetData={handleResetData}
        onExportPDF={handleExportPDF}
        onPrint={handlePrint}
        onOpenProductDialog={() => setProductDialogOpen(true)}
        isPdfLoading={isPdfLoading}
        selectedProductsCount={queueItems.length}
      />

      {/* Main Grid: Sidebar Controls (Left) + Live Preview Canvas (Right) */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Sidebar Form Controls */}
        <StickerFormPanel
          item={item}
          onChangeItem={(newItem) => {
            setItem(newItem);
            if (queueItems.length > 0) {
              const updatedQueue = [...queueItems];
              updatedQueue[activeQueueIdx] = newItem;
              setQueueItems(updatedQueue);
            }
          }}
          geometry={geometry}
          onChangeGeometry={setGeometry}
          settings={settings}
          onChangeSettings={setSettings}
          stats={stats}
          presets={PRESETS}
        />

        {/* Right Preview Workspace Canvas */}
        <main className="flex-1 w-full bg-muted/20 border border-border/80 rounded-2xl p-4 md:p-6 min-h-[650px] flex flex-col items-center justify-start overflow-hidden relative">
          {/* Multi-Product Queue Navigation Bar (if products selected) */}
          {queueItems.length > 0 && (
            <div className="w-full mb-4 p-3 bg-card border border-primary/30 rounded-xl flex items-center justify-between gap-3 text-xs shadow-xs no-print">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-bold text-foreground">
                    Antrean Cetak ({queueItems.length} Produk)
                  </span>
                  <p className="text-[11px] text-muted-foreground truncate max-w-xs sm:max-w-md">
                    Produk {activeQueueIdx + 1}:{" "}
                    <strong className="text-primary">{item.productName}</strong> ({item.serialNo})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveQueueIdx((i) => (i > 0 ? i - 1 : queueItems.length - 1))
                    }
                    className="p-1 hover:bg-accent rounded text-foreground"
                    title="Produk Sebelumnya"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-2 font-bold font-mono text-[11px]">
                    {activeQueueIdx + 1} / {queueItems.length}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveQueueIdx((i) => (i < queueItems.length - 1 ? i + 1 : 0))
                    }
                    className="p-1 hover:bg-accent rounded text-foreground"
                    title="Produk Selanjutnya"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={clearQueue}
                  className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  title="Hapus Antrean Multi-Produk"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Canvas Wrapper */}
          <div
            ref={wrapperRef}
            className="w-full flex-1 flex flex-col items-center justify-start overflow-auto p-4 transition-all"
          >
            {activeTab === "single" ? (
              <>
                <div
                  className="flex flex-col items-center justify-center min-h-[450px] transition-transform duration-200"
                  style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "center top" }}
                >
                  <EtsSticker item={item} geometry={geometry} className="shadow-2xl rounded-xl" />
                  <div className="mt-6 text-center text-xs text-muted-foreground font-mono">
                    Ukuran Stiker: {geometry.widthMm}mm × {geometry.heightMm}mm
                  </div>
                </div>

                {/* Off-screen A4 container for immediate export & print in single mode */}
                <div className="fixed -top-[9999px] -left-[9999px] opacity-0 pointer-events-none">
                  <A4PrintLayout
                    items={a4Items}
                    geometry={geometry}
                    settings={settings}
                    stats={stats}
                  />
                </div>
              </>
            ) : (
              <div
                className="transition-transform duration-200 flex flex-col items-center"
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "center top" }}
              >
                <A4PrintLayout
                  items={a4Items}
                  geometry={geometry}
                  settings={settings}
                  stats={stats}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Admin Product Multi-Select Modal */}
      <ProductSelectDialog
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        onSelectProducts={handleSelectProducts}
      />
    </div>
  );
}
