import React from 'react';
import { formatSerialNumber } from '@/lib/utils';
import { StickerData, StickerConfig, LayoutStats } from '../types';
import { ProductWithRelations } from '@/services/products.service';
import { ProductDualTableSelector } from './ProductDualTableSelector';
import { Sliders, Package, RefreshCw } from 'lucide-react';

interface StickerConfigurationPanelProps {
  allProducts: ProductWithRelations[];
  loadingProducts?: boolean;
  onSelectProducts: (products: StickerData[]) => void;

  selectedProducts: StickerData[];
  activeProductIndex: number;
  setActiveProductIndex: (index: number) => void;
  currentSticker: StickerData;
  onUpdateCurrentSticker: (field: keyof StickerData, value: string) => void;
  onOpenProductModal: () => void;

  config: StickerConfig;
  onUpdateConfig: <K extends keyof StickerConfig>(key: K, value: StickerConfig[K]) => void;
  layoutStats: LayoutStats;

  onReset: () => void;
}

export const StickerConfigurationPanel: React.FC<StickerConfigurationPanelProps> = ({
  allProducts,
  loadingProducts = false,
  onSelectProducts,
  selectedProducts,
  activeProductIndex,
  setActiveProductIndex,
  currentSticker,
  onUpdateCurrentSticker,
  onOpenProductModal,
  config,
  onUpdateConfig,
  layoutStats,
  onReset,
}) => {
  return (
    <aside className="w-full flex flex-col gap-5 p-4 bg-transparent border-r border-border text-card-foreground overflow-y-auto">
      {/* 1. DUAL TABLE PRODUCT SELECTOR + FILTER & SETTING */}
      <ProductDualTableSelector
        allProducts={allProducts}
        loadingProducts={loadingProducts}
        selectedProducts={selectedProducts}
        onSelectProducts={onSelectProducts}
        activeProductIndex={activeProductIndex}
        setActiveProductIndex={setActiveProductIndex}
        config={config}
        onUpdateConfig={onUpdateConfig}
      />

      {/* 2. EDIT FIELD DATA PRODUK ACTIVE */}
      <section className="bg-muted/40 border border-border rounded-xl p-4 shadow-xs flex flex-col gap-3.5">
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <h2 className="text-xs font-bold tracking-wider uppercase flex items-center gap-2 text-accent-foreground">
            <Sliders className="size-4 text-accent-foreground" />
            Edit Detail Stiker Active
          </h2>
          <button
            type="button"
            onClick={onOpenProductModal}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-accent-foreground border border-primary/20 hover:bg-primary/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Package className="size-3.5" />
            {selectedProducts.length > 0 ? `Modal (${selectedProducts.length})` : 'Import Modal'}
          </button>
        </div>

        {/* Form Fields */}
        <div className="flex flex-col gap-1">
          <label htmlFor="input-product-name" className="text-xs font-medium text-muted-foreground">
            Product Name
          </label>
          <input
            type="text"
            id="input-product-name"
            value={currentSticker.productName}
            onChange={(e) => onUpdateCurrentSticker('productName', e.target.value)}
            placeholder="contoh: ETS-5.000.AIZ"
            className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <label htmlFor="input-serial-no" className="text-xs font-medium text-muted-foreground">
              Serial No.
            </label>
            <span className="text-[10px] font-bold text-accent-foreground bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-md">
              Anti-Spasi
            </span>
          </div>
          <input
            type="text"
            id="input-serial-no"
            value={currentSticker.serialNo}
            onChange={(e) =>
              onUpdateCurrentSticker('serialNo', formatSerialNumber(e.target.value))
            }
            onKeyDown={(e) => {
              if (e.key === ' ' || e.code === 'Space') e.preventDefault();
            }}
            placeholder="contoh: XSI-II512-B-5000-1-0004"
            className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="input-capacity" className="text-xs font-medium text-muted-foreground">
              Capacity
            </label>
            <input
              type="text"
              id="input-capacity"
              value={currentSticker.capacity}
              onChange={(e) => onUpdateCurrentSticker('capacity', e.target.value)}
              placeholder="contoh: 5000 VA / 5 KVA"
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="input-prod-no" className="text-xs font-medium text-muted-foreground">
              Prod. No
            </label>
            <input
              type="text"
              id="input-prod-no"
              value={currentSticker.prodNo}
              onChange={(e) => onUpdateCurrentSticker('prodNo', e.target.value)}
              placeholder="contoh: B312D-00004"
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="input-voltage" className="text-xs font-medium text-muted-foreground">
              Voltage
            </label>
            <input
              type="text"
              id="input-voltage"
              value={currentSticker.voltage}
              onChange={(e) => onUpdateCurrentSticker('voltage', e.target.value)}
              placeholder="contoh: AC 220V"
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="input-frequency" className="text-xs font-medium text-muted-foreground">
              Frequency
            </label>
            <input
              type="text"
              id="input-frequency"
              value={currentSticker.frequency}
              onChange={(e) => onUpdateCurrentSticker('frequency', e.target.value)}
              placeholder="contoh: 50 Hz"
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="input-model" className="text-xs font-medium text-muted-foreground">
            Model
          </label>
          <input
            type="text"
            id="input-model"
            value={currentSticker.model}
            onChange={(e) => onUpdateCurrentSticker('model', e.target.value)}
            placeholder="contoh: AIZ"
            className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
          />
        </div>
      </section>

      {/* 3. RINGKASAN KAPASITAS CETAK */}
      <section className="bg-muted/40 border border-border rounded-xl p-3.5 space-y-2 text-xs">
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Produk Terpilih:</span>
          <span className="font-semibold text-foreground">{layoutStats.totalItems} item produk</span>
        </div>
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Cetak per Item:</span>
          <span className="font-semibold text-foreground">{config.copies} stiker/item</span>
        </div>
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Total Stiker Dicetak:</span>
          <span className="font-bold text-primary">{layoutStats.totalStickers} pcs stiker</span>
        </div>
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Kapasitas 1 Lembar A4:</span>
          <span className="font-semibold text-foreground">{layoutStats.capacityPerPage} stiker/A4 ({layoutStats.cols}×{layoutStats.rows})</span>
        </div>
        <div className="flex justify-between items-center text-muted-foreground pt-1.5 border-t border-border">
          <span>Kebutuhan Kertas:</span>
          <span className="font-bold text-accent-foreground">
            {layoutStats.totalPages} Halaman A4
          </span>
        </div>
      </section>

      {/* RESET ACTION */}
      <div className="flex flex-col gap-2 pt-2 border-t border-border">
        <button
          type="button"
          onClick={onReset}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-border bg-background text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer"
          title="Reset Konfigurasi Ke Default"
        >
          <RefreshCw className="size-3.5" />
          <span>Reset Konfigurasi</span>
        </button>
      </div>
    </aside>
  );
};
