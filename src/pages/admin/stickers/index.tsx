import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import '@/features/stickers/stickers.css';
import { StickerData, StickerConfig, PreviewTab } from '@/features/stickers/types';
import { calculateLayoutStats } from '@/features/stickers/utils/layout-calculator';
import { exportA4PagesToPDF, exportA4PagesToNativePrint } from '@/features/stickers/utils/pdf-exporter';
import { StickerConfigurationPanel } from '@/features/stickers/components/StickerConfigurationPanel';
import { StickerPreviewToolbar } from '@/features/stickers/components/StickerPreviewToolbar';
import { InteractiveCanvasStage } from '@/features/stickers/components/InteractiveCanvasStage';
import { StickerTopControls } from '@/features/stickers/components/StickerTopControls';
import { ProductSelectorModal, mapProductToStickerData } from '@/features/stickers/components/ProductSelectorModal';
import { useProducts } from '@/hooks/use-products';
import { useClients } from '@/hooks/use-clients';
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
  copies: 1, // Default cetak per item = 1
  pdfScale: 4,
};

const CACHE_KEY = 'sticker_page_cache_v1';

export default function StickersPage() {
  const [searchParams] = useSearchParams();
  const { data: allDbProducts } = useProducts();
  const { data: clients = [] } = useClients();

  // Filter & Search & Setting states shared between mobile sticky bar and desktop panel
  const [selectedClient, setSelectedClient] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

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

  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);

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
  ]);

  // Derived client options for dropdown
  const clientOptions = useMemo(() => {
    const clientMap = new Map<string, string>();

    clients.forEach((c) => {
      if (c.client_id && c.client_name) {
        clientMap.set(c.client_id, c.client_name);
      }
    });

    (allDbProducts || []).forEach((p) => {
      if (p.client?.client_id && p.client?.client_name) {
        clientMap.set(p.client.client_id, p.client.client_name);
      } else if (p.client?.client_name) {
        clientMap.set(p.client.client_name, p.client.client_name);
      }
    });

    return Array.from(clientMap.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [clients, allDbProducts]);

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
    return calculateLayoutStats(config, selectedProducts.length || 1);
  }, [config, selectedProducts.length]);

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
    if (activeTab === 'single') {
      setZoomLevel(100);
      return;
    }
    const isMobileScreen = window.innerWidth <= 768;
    const fitPercent = isMobileScreen ? 45 : 75;
    setZoomLevel(fitPercent);
  }, [activeTab]);

  const handleReset = () => {
    setSelectedProducts([]);
    setActiveProductIndex(0);
    setSingleStickerData(DEFAULT_STICKER_DATA);
    setConfig(DEFAULT_CONFIG);
    setZoomLevel(100);
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

  const handleDownloadPdf = async () => {
    if (activeTab !== 'a4') {
      setActiveTab('a4');
    }

    setIsGeneratingPdf(true);

    try {
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

  const handleDownloadPdfNative = async () => {
    if (activeTab !== 'a4') {
      setActiveTab('a4');
    }

    setIsGeneratingPdf(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 150));

      const container = a4ContainerRef.current;
      if (!container) {
        throw new Error('Container A4 tidak ditemukan.');
      }

      await exportA4PagesToNativePrint(
        container,
        currentSticker.productName,
        config.copies
      );
    } catch (err: any) {
      console.error('Failed to export PDF:', err);
      toast.error(err.message || 'Gagal mengunduh PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    handleDownloadPdfNative();
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-65px)] w-full bg-background text-foreground relative">
      {/* ── MOBILE STICKY CONTROLS ──
          Sticky at the top on mobile so when scrolling down past Table 1, Table 2, and the Preview Area, 
          Filter, Search, and Setting remain firmly pinned at the top of the mobile screen. */}
      <div className="sticky top-0 z-30 lg:hidden w-full bg-background/95 backdrop-blur-md border-b border-border/70 px-3 py-2 sm:px-4 shadow-xs">
        <StickerTopControls
          clients={clients}
          clientOptions={clientOptions}
          selectedClient={selectedClient}
          onSelectClient={setSelectedClient}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          isSettingsOpen={isSettingsOpen}
          setIsSettingsOpen={setIsSettingsOpen}
          config={config}
          onUpdateConfig={updateConfig}
          onReset={handleReset}
        />
      </div>

      {/* App Main Layout: Mobile = Table first, Preview second. Desktop = Left Preview (1fr), Right Table (400px) */}
      <main className="app-layout flex flex-col lg:grid lg:grid-cols-[1fr_400px] flex-1 min-h-0 lg:h-[calc(100vh-65px)] lg:overflow-hidden">
        {/* Table & Controls: Top on mobile (order-1), Right on desktop (order-2) */}
        <div className="w-full order-1 lg:order-2 lg:col-start-2 lg:h-full lg:overflow-y-auto min-h-0">
          <StickerConfigurationPanel
            allProducts={allDbProducts || []}
            loadingProducts={!allDbProducts}
            onSelectProducts={setSelectedProducts}
            selectedProducts={selectedProducts}
            activeProductIndex={activeProductIndex}
            setActiveProductIndex={setActiveProductIndex}
            onOpenProductModal={() => setIsProductModalOpen(true)}
            config={config}
            onUpdateConfig={updateConfig}
            onReset={handleReset}
            selectedClient={selectedClient}
            setSelectedClient={setSelectedClient}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            isSettingsOpen={isSettingsOpen}
            setIsSettingsOpen={setIsSettingsOpen}
            hideTopControlsOnMobile={true}
          />
        </div>

        {/* Main Preview Area: Below table on mobile (order-2), Left on desktop (order-1) */}
        <section className="preview-area flex flex-col gap-3 sm:gap-4 p-3 sm:p-5 bg-background/95 order-2 lg:order-1 lg:col-start-1 lg:h-full overflow-y-auto min-h-0">
          {/* Toolbar */}
          <StickerPreviewToolbar
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
              setTimeout(() => autoFitZoom(), 50);
            }}
            zoomLevel={zoomLevel}
            onZoomIn={() => setZoomLevel((prev) => Math.min(400, prev + 10))}
            onZoomOut={() => setZoomLevel((prev) => Math.max(15, prev - 10))}
            onZoomReset={() => setZoomLevel(100)}
            onZoomFit={autoFitZoom}
            onDownloadPdf={handleDownloadPdf}
            onDownloadPdfNative={handleDownloadPdfNative}
            onPrint={handlePrint}
            isGeneratingPdf={isGeneratingPdf}
            pdfScale={config.pdfScale}
          />

          {/* Interactive Free Canvas Artboard (Pinch, Zoom, Drag/Pan anywhere past borders) */}
          <InteractiveCanvasStage
            activeTab={activeTab}
            currentSticker={currentSticker}
            selectedProducts={selectedProducts}
            activeProductIndex={activeProductIndex}
            setActiveProductIndex={setActiveProductIndex}
            config={config}
            layoutStats={layoutStats}
            zoomLevel={zoomLevel}
            onZoomChange={setZoomLevel}
            onResetZoomAndPan={() => {
              autoFitZoom();
            }}
            a4ContainerRef={a4ContainerRef}
          />
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
