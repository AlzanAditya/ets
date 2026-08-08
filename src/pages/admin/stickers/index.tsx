import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import '@/features/stickers/stickers.css';
import { StickerData, StickerConfig, PreviewTab } from '@/features/stickers/types';
import { calculateLayoutStats } from '@/features/stickers/utils/layout-calculator';
import { generateRandomStickerData } from '@/features/stickers/utils/randomizer';
import { exportA4PagesToPDF } from '@/features/stickers/utils/pdf-exporter';
import { StickerConfigurationPanel } from '@/features/stickers/components/StickerConfigurationPanel';
import { StickerPreviewToolbar } from '@/features/stickers/components/StickerPreviewToolbar';
import { SingleStickerStage } from '@/features/stickers/components/SingleStickerStage';
import { A4PrintLayoutStage } from '@/features/stickers/components/A4PrintLayoutStage';
import { ProductSelectorModal, mapProductToStickerData } from '@/features/stickers/components/ProductSelectorModal';
import { useProducts } from '@/hooks/use-products';
import { toast } from 'sonner';

const DEFAULT_STICKER_DATA: StickerData = {
  productName: 'ETS-5.000.AIZ',
  serialNo: 'ETS-SN-00001',
  capacity: '5000 VA / 5 KVA',
  prodNo: 'B312D-00004',
  voltage: 'AC 220V',
  frequency: '50 Hz',
  model: 'AIZ',
};

const DEFAULT_CONFIG: StickerConfig = {
  widthMm: 60,
  heightMm: 30,
  marginMm: 2,
  hGapMm: 2,
  vGapMm: 2,
  copies: 10,
  pdfScale: 4,
};

const CACHE_KEY = 'sticker_page_cache_v1';

export default function StickersPage() {
  const [searchParams] = useSearchParams();
  const { data: allDbProducts } = useProducts();

  // Read initial cache safely from localStorage
  const cachedState = useMemo(() => {
    try {
      const saved = localStorage.getItem(CACHE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error reading sticker cache from localStorage:', e);
    }
    return null;
  }, []);

  const [selectedProducts, setSelectedProducts] = useState<StickerData[]>(
    () => cachedState?.selectedProducts ?? []
  );
  const [activeProductIndex, setActiveProductIndex] = useState<number>(
    () => cachedState?.activeProductIndex ?? 0
  );

  const [singleStickerData, setSingleStickerData] = useState<StickerData>(
    () => cachedState?.singleStickerData ?? DEFAULT_STICKER_DATA
  );
  const [config, setConfig] = useState<StickerConfig>(
    () => ({ ...DEFAULT_CONFIG, ...(cachedState?.config || {}) })
  );

  const [activeTab, setActiveTab] = useState<PreviewTab>(
    () => cachedState?.activeTab ?? 'single'
  );
  const [zoomLevel, setZoomLevel] = useState<number>(
    () => cachedState?.zoomLevel ?? 100
  );

  const [isRandomizing, setIsRandomizing] = useState<boolean>(false);
  const [randomSpeedMs, setRandomSpeedMs] = useState<number>(
    () => cachedState?.randomSpeedMs ?? 100
  );
  const randomizeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);

  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const a4ContainerRef = useRef<HTMLDivElement>(null);

  // Sync state variables to localStorage whenever they change
  useEffect(() => {
    try {
      const stateToCache = {
        selectedProducts,
        activeProductIndex,
        singleStickerData,
        config,
        activeTab,
        zoomLevel,
        randomSpeedMs,
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(stateToCache));
    } catch (e) {
      console.error('Failed to save sticker cache to localStorage:', e);
    }
  }, [
    selectedProducts,
    activeProductIndex,
    singleStickerData,
    config,
    activeTab,
    zoomLevel,
    randomSpeedMs,
  ]);

  // Auto-select product from URL params if navigated from Admin Products page
  useEffect(() => {
    const snParam = searchParams.get('sn') || searchParams.get('serial_number');
    const snsParam = searchParams.get('sns');

    if (allDbProducts && allDbProducts.length > 0) {
      if (snsParam) {
        const serialList = snsParam.split(',').map((s) => s.trim().replace(/\s+/g, ''));
        const matched = allDbProducts.filter((p) =>
          serialList.includes(p.serial_number.replace(/\s+/g, ''))
        );
        if (matched.length > 0) {
          setSelectedProducts(matched.map(mapProductToStickerData));
          toast.info(`${matched.length} produk dimuat untuk cetak stiker.`);
        }
      } else if (snParam) {
        const cleanSn = snParam.trim().replace(/\s+/g, '');
        const matched = allDbProducts.find(
          (p) => p.serial_number.replace(/\s+/g, '') === cleanSn || p.product_id === snParam
        );
        if (matched) {
          setSelectedProducts([mapProductToStickerData(matched)]);
          toast.info(`Produk ${matched.product_name} dimuat untuk cetak stiker.`);
        }
      }
    }
  }, [searchParams, allDbProducts]);

  // Active current sticker data
  const currentSticker = useMemo(() => {
    if (selectedProducts.length > 0 && selectedProducts[activeProductIndex]) {
      return selectedProducts[activeProductIndex];
    }
    return singleStickerData;
  }, [selectedProducts, activeProductIndex, singleStickerData]);

  const layoutStats = useMemo(() => {
    return calculateLayoutStats(config);
  }, [config]);

  const updateCurrentStickerField = (field: keyof StickerData, value: string) => {
    if (selectedProducts.length > 0 && selectedProducts[activeProductIndex]) {
      setSelectedProducts((prev) => {
        const updated = [...prev];
        updated[activeProductIndex] = {
          ...updated[activeProductIndex],
          [field]: value,
        };
        return updated;
      });
    } else {
      setSingleStickerData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const updateConfig = <K extends keyof StickerConfig>(
    key: K,
    value: StickerConfig[K]
  ) => {
    setConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Auto fit zoom calculation
  const autoFitZoom = useCallback(() => {
    const wrapper = canvasWrapperRef.current;
    if (!wrapper) return;
    const padding = window.innerWidth <= 768 ? 16 : 32;
    const availableWidth = wrapper.clientWidth - padding;
    if (availableWidth <= 0) return;

    let contentWidthPx = 800; // A4 page width approx @ 96DPI
    if (activeTab === 'single') {
      contentWidthPx = Math.max(220, config.widthMm * 3.7795 + 60);
    } else {
      contentWidthPx = 794 + 16;
    }

    const fitRatio = availableWidth / contentWidthPx;
    const fitPercent = Math.min(100, Math.max(20, Math.floor(fitRatio * 100)));
    setZoomLevel(fitPercent);
  }, [activeTab, config.widthMm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      autoFitZoom();
    }, 100);

    const handleResize = () => {
      autoFitZoom();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [autoFitZoom]);

  // Handle Randomizer Tick
  useEffect(() => {
    if (isRandomizing) {
      randomizeIntervalRef.current = setInterval(() => {
        const randomData = generateRandomStickerData();
        setSingleStickerData(randomData);
        if (selectedProducts.length > 0) {
          setSelectedProducts((prev) => {
            const updated = [...prev];
            if (updated[activeProductIndex]) {
              updated[activeProductIndex] = {
                ...updated[activeProductIndex],
                ...randomData,
              };
            }
            return updated;
          });
        }
      }, randomSpeedMs);
    } else {
      if (randomizeIntervalRef.current) {
        clearInterval(randomizeIntervalRef.current);
        randomizeIntervalRef.current = null;
      }
    }

    return () => {
      if (randomizeIntervalRef.current) {
        clearInterval(randomizeIntervalRef.current);
      }
    };
  }, [isRandomizing, randomSpeedMs, selectedProducts, activeProductIndex]);

  const handleToggleRandomize = () => {
    setIsRandomizing((prev) => !prev);
  };

  const handleReset = () => {
    if (isRandomizing) {
      setIsRandomizing(false);
    }
    setSelectedProducts([]);
    setActiveProductIndex(0);
    setSingleStickerData(DEFAULT_STICKER_DATA);
    setConfig(DEFAULT_CONFIG);
    setZoomLevel(100);
    setRandomSpeedMs(100);
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (e) {
      console.error('Failed to clear sticker cache from localStorage:', e);
    }
    toast.success('Konfigurasi stiker berhasil direset.');
  };

  const handleSelectProductsFromModal = (products: StickerData[]) => {
    setSelectedProducts(products);
    setActiveProductIndex(0);
    toast.success(`${products.length} produk berhasil dimuat ke Sticker Generator.`);
  };

  const handleRemoveProduct = (index: number) => {
    setSelectedProducts((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (activeProductIndex >= updated.length) {
        setActiveProductIndex(Math.max(0, updated.length - 1));
      }
      return updated;
    });
  };

  const handleDownloadPdf = async () => {
    if (isRandomizing) {
      setIsRandomizing(false);
    }

    // Switch to A4 tab if not already there so container ref is mounted
    if (activeTab !== 'a4') {
      setActiveTab('a4');
    }

    setIsGeneratingPdf(true);

    try {
      // Give DOM time to update/render A4 container if tab switched
      await new Promise((resolve) => setTimeout(resolve, 150));

      const container = a4ContainerRef.current;
      if (!container) {
        throw new Error('Container A4 tidak ditemukan.');
      }

      await exportA4PagesToPDF(
        container,
        config.pdfScale,
        currentSticker.productName,
        config.copies
      );

      toast.success('PDF Stiker berhasil diunduh!');
    } catch (err: any) {
      console.error('Failed to export PDF:', err);
      toast.error(err.message || 'Gagal mengunduh PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    if (isRandomizing) {
      setIsRandomizing(false);
    }
    if (activeTab !== 'a4') {
      setActiveTab('a4');
    }
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-65px)] w-full bg-background text-foreground">
      {/* App Main Layout Grid */}
      <main className="app-layout grid grid-cols-1 lg:grid-cols-[360px_1fr] flex-1">
        {/* Left Sidebar Controls */}
        <StickerConfigurationPanel
          selectedProducts={selectedProducts}
          activeProductIndex={activeProductIndex}
          setActiveProductIndex={setActiveProductIndex}
          currentSticker={currentSticker}
          onUpdateCurrentSticker={updateCurrentStickerField}
          onOpenProductModal={() => setIsProductModalOpen(true)}
          onRemoveProduct={handleRemoveProduct}
          config={config}
          onUpdateConfig={updateConfig}
          layoutStats={layoutStats}
          isRandomizing={isRandomizing}
          onToggleRandomize={handleToggleRandomize}
          randomSpeedMs={randomSpeedMs}
          onChangeRandomSpeed={setRandomSpeedMs}
          onReset={handleReset}
        />

        {/* Right Main Preview Area */}
        <section className="preview-area flex flex-col items-center gap-5 p-4 sm:p-6 bg-[#090d16] overflow-y-auto">
          {/* Toolbar */}
          <StickerPreviewToolbar
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
              setTimeout(() => autoFitZoom(), 50);
            }}
            zoomLevel={zoomLevel}
            onZoomIn={() => setZoomLevel((prev) => Math.min(250, prev + 10))}
            onZoomOut={() => setZoomLevel((prev) => Math.max(20, prev - 10))}
            onZoomReset={() => setZoomLevel(100)}
            onZoomFit={autoFitZoom}
            onDownloadPdf={handleDownloadPdf}
            onPrint={handlePrint}
            isGeneratingPdf={isGeneratingPdf}
            pdfScale={config.pdfScale}
          />

          {/* Canvas Wrapper */}
          <div
            ref={canvasWrapperRef}
            className="canvas-wrapper flex flex-col items-center w-full max-w-[1000px] min-h-[450px] p-4 overflow-auto"
          >
            {activeTab === 'single' ? (
              <SingleStickerStage
                currentSticker={currentSticker}
                selectedProducts={selectedProducts}
                activeProductIndex={activeProductIndex}
                setActiveProductIndex={setActiveProductIndex}
                config={config}
                zoomLevel={zoomLevel}
              />
            ) : (
              <A4PrintLayoutStage
                selectedProducts={selectedProducts}
                currentSticker={currentSticker}
                config={config}
                layoutStats={layoutStats}
                zoomLevel={zoomLevel}
                containerRef={a4ContainerRef}
              />
            )}
          </div>
        </section>
      </main>

      {/* Product Selector Modal */}
      <ProductSelectorModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSelectProducts={handleSelectProductsFromModal}
        selectedSerialNos={selectedProducts.map((p) => p.serialNo)}
      />
    </div>
  );
}
