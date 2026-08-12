import React, { useState, useEffect } from 'react';
import { StickerData, StickerConfig, LayoutStats } from '../types';
import { Sliders, Grid, LayoutGrid, Package, RefreshCw, Zap, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface DeferredNumberInputProps {
  id?: string;
  label: string;
  value: number;
  min?: number;
  max?: number;
  isInteger?: boolean;
  onCommit: (val: number) => void;
  className?: string;
}

const DeferredNumberInput: React.FC<DeferredNumberInputProps> = ({
  id,
  label,
  value,
  min,
  max,
  isInteger = false,
  onCommit,
  className = "w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono",
}) => {
  const [localVal, setLocalVal] = useState<string>(String(value));

  useEffect(() => {
    setLocalVal(String(value));
  }, [value]);

  const handleCommit = () => {
    const trimmed = localVal.trim();
    if (trimmed === '') {
      toast.error(`Field ${label} tidak boleh kosong. Mengembalikan nilai ke ${value}.`);
      setLocalVal(String(value));
      return;
    }

    const parsed = isInteger ? parseInt(trimmed, 10) : parseFloat(trimmed);

    if (isNaN(parsed)) {
      toast.error(`Nilai ${label} tidak valid.`);
      setLocalVal(String(value));
      return;
    }

    if (min !== undefined && parsed < min) {
      toast.error(`Nilai ${label} minimal adalah ${min}.`);
      setLocalVal(String(value));
      return;
    }

    if (max !== undefined && parsed > max) {
      toast.error(`Nilai ${label} maksimal adalah ${max}.`);
      setLocalVal(String(value));
      return;
    }

    setLocalVal(String(parsed));
    if (parsed !== value) {
      onCommit(parsed);
    }
  };

  return (
    <input
      type="number"
      id={id}
      value={localVal}
      min={min}
      max={max}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={handleCommit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleCommit();
          e.currentTarget.blur();
        }
      }}
      className={className}
    />
  );
};

interface StickerConfigurationPanelProps {
  // Product Data
  selectedProducts: StickerData[];
  activeProductIndex: number;
  setActiveProductIndex: (index: number) => void;
  currentSticker: StickerData;
  onUpdateCurrentSticker: (field: keyof StickerData, value: string) => void;
  onOpenProductModal: () => void;
  onRemoveProduct: (index: number) => void;

  // Geometry & Layout
  config: StickerConfig;
  onUpdateConfig: <K extends keyof StickerConfig>(key: K, value: StickerConfig[K]) => void;
  layoutStats: LayoutStats;

  // Demo / Randomize & Reset
  isRandomizing: boolean;
  onToggleRandomize: () => void;
  randomSpeedMs: number;
  onChangeRandomSpeed: (speed: number) => void;
  onReset: () => void;
}

const PRESET_SIZES = [
  { width: 60, height: 30, label: '60 × 30 mm' },
  { width: 100, height: 50, label: '100 × 50 mm' },
  { width: 120, height: 50, label: '120 × 50 mm' },
  { width: 110, height: 50, label: '110 × 50 mm' },
  { width: 80, height: 50, label: '80 × 50 mm' },
];

export const StickerConfigurationPanel: React.FC<StickerConfigurationPanelProps> = ({
  selectedProducts,
  activeProductIndex,
  setActiveProductIndex,
  currentSticker,
  onUpdateCurrentSticker,
  onOpenProductModal,
  onRemoveProduct,
  config,
  onUpdateConfig,
  layoutStats,
  isRandomizing,
  onToggleRandomize,
  randomSpeedMs,
  onChangeRandomSpeed,
  onReset,
}) => {
  return (
    <aside className="w-full flex flex-col gap-5 p-4 bg-transparent border-r border-border text-card-foreground overflow-y-auto">
      {/* 1. PRODUCT DATA SECTION */}
      <section className="bg-muted/40 border border-border rounded-xl p-4 shadow-xs flex flex-col gap-3.5">
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <h2 className="text-xs font-bold tracking-wider uppercase flex items-center gap-2 text-accent-foreground">
            <Sliders className="size-4 text-accent-foreground" />
            Data Produk ETS
          </h2>
          <button
            type="button"
            onClick={onOpenProductModal}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-accent-foreground border border-primary/20 hover:bg-primary/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Package className="size-3.5" />
            {selectedProducts.length > 0 ? `Pilih (${selectedProducts.length})` : 'Import dari Products'}
          </button>
        </div>

        {/* Selected Products Chips/List if Multi-Product */}
        {selectedProducts.length > 1 && (
          <div className="flex flex-col gap-1.5 bg-background p-2.5 rounded-lg border border-border">
            <span className="text-[11px] font-semibold text-muted-foreground">
              Produk Terpilih ({selectedProducts.length} Pcs):
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
              {selectedProducts.map((p, idx) => (
                <div
                  key={p.id || idx}
                  onClick={() => setActiveProductIndex(idx)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs cursor-pointer border transition-all ${
                    idx === activeProductIndex
                      ? 'bg-primary text-primary-foreground font-bold border-primary shadow-xs'
                      : 'bg-muted text-muted-foreground border-border hover:border-primary/50'
                  }`}
                >
                  <span className="truncate max-w-[110px]">{p.productName}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveProduct(idx);
                    }}
                    className="opacity-70 hover:opacity-100 hover:text-destructive transition-colors cursor-pointer"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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
              onUpdateCurrentSticker('serialNo', e.target.value.replace(/\s+/g, ''))
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

      {/* 2. STICKER SIZE SECTION */}
      <section className="bg-muted/40 border border-border rounded-xl p-4 shadow-xs flex flex-col gap-3.5">
        <h2 className="text-xs font-bold tracking-wider uppercase flex items-center gap-2 text-accent-foreground border-b border-border pb-2.5">
          <Grid className="size-4 text-accent-foreground" />
          Ukuran Stiker (mm)
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="input-width" className="text-xs font-medium text-muted-foreground">
              Width (mm)
            </label>
            <DeferredNumberInput
              id="input-width"
              label="Width"
              value={config.widthMm}
              min={10}
              max={250}
              onCommit={(val) => onUpdateConfig('widthMm', val)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="input-height" className="text-xs font-medium text-muted-foreground">
              Height (mm)
            </label>
            <DeferredNumberInput
              id="input-height"
              label="Height"
              value={config.heightMm}
              min={10}
              max={200}
              onCommit={(val) => onUpdateConfig('heightMm', val)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Preset Ukuran Populer:</label>
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {PRESET_SIZES.map((preset) => {
              const isActive =
                config.widthMm === preset.width && config.heightMm === preset.height;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    onUpdateConfig('widthMm', preset.width);
                    onUpdateConfig('heightMm', preset.height);
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. A4 LAYOUT SETTINGS */}
      <section className="bg-muted/40 border border-border rounded-xl p-4 shadow-xs flex flex-col gap-3.5">
        <h2 className="text-xs font-bold tracking-wider uppercase flex items-center gap-2 text-accent-foreground border-b border-border pb-2.5">
          <LayoutGrid className="size-4 text-accent-foreground" />
          Layout Kertas A4
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="input-margin" className="text-xs font-medium text-muted-foreground">
              Margin A4 (mm)
            </label>
            <DeferredNumberInput
              id="input-margin"
              label="Margin A4"
              value={config.marginMm}
              min={0}
              max={50}
              onCommit={(val) => onUpdateConfig('marginMm', val)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="input-copies" className="text-xs font-medium text-muted-foreground">
              Jumlah Cetak (Pcs)
            </label>
            <DeferredNumberInput
              id="input-copies"
              label="Jumlah Cetak"
              value={config.copies}
              min={1}
              max={500}
              isInteger
              onCommit={(val) => onUpdateConfig('copies', val)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="input-hgap" className="text-xs font-medium text-muted-foreground">
              Gap Horisontal (mm)
            </label>
            <DeferredNumberInput
              id="input-hgap"
              label="Gap Horisontal"
              value={config.hGapMm}
              min={0}
              max={20}
              onCommit={(val) => onUpdateConfig('hGapMm', val)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="input-vgap" className="text-xs font-medium text-muted-foreground">
              Gap Vertikal (mm)
            </label>
            <DeferredNumberInput
              id="input-vgap"
              label="Gap Vertikal"
              value={config.vGapMm}
              min={0}
              max={20}
              onCommit={(val) => onUpdateConfig('vGapMm', val)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="select-pdf-scale" className="text-xs font-medium text-muted-foreground">
            Skala Kualitas PDF (Resolusi/DPI)
          </label>
          <select
            id="select-pdf-scale"
            value={config.pdfScale}
            onChange={(e) =>
              onUpdateConfig('pdfScale', parseInt(e.target.value, 10) || 3)
            }
            className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer font-medium"
          >
            <option value={1} className="bg-popover text-popover-foreground">1x Scale (Draft / Cepat)</option>
            <option value={2} className="bg-popover text-popover-foreground">2x Scale (Standard HD)</option>
            <option value={3} className="bg-popover text-popover-foreground">3x Scale (Super Jernih - Default)</option>
            <option value={4} className="bg-popover text-popover-foreground">4x Scale (Ultra HD / High-Res)</option>
          </select>
        </div>
      </section>

      {/* 4. LAYOUT CAPACITY SUMMARY */}
      <section className="bg-muted/40 border border-border rounded-xl p-3.5 space-y-2 text-xs">
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Susunan Kolom:</span>
          <span className="font-semibold text-foreground">{layoutStats.cols} kolom</span>
        </div>
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Susunan Baris:</span>
          <span className="font-semibold text-foreground">{layoutStats.rows} baris</span>
        </div>
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Kapasitas 1 lembar A4:</span>
          <span className="font-bold text-accent-foreground">{layoutStats.capacityPerPage} stiker/A4</span>
        </div>
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Kebutuhan Kertas:</span>
          <span className="font-bold text-accent-foreground">
            {layoutStats.totalPages} Halaman ({config.copies} pcs)
          </span>
        </div>
      </section>

      {/* DEMO / RANDOMIZE & RESET ACTIONS */}
      <div className="flex flex-col gap-2.5 pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleRandomize}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
              isRandomizing
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 animate-pulse'
                : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
            }`}
          >
            <Zap className="size-4" />
            <span>
              {isRandomizing ? '⏸ Stop Randomize' : `⚡ Live Demo (${randomSpeedMs}ms)`}
            </span>
          </button>
          <button
            type="button"
            onClick={onReset}
            className="p-2.5 rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer"
            title="Reset Data Ke Default Reference"
          >
            <RefreshCw className="size-4" />
          </button>
        </div>

        {/* Speed chips for demo */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>Speed:</span>
          <div className="flex gap-1">
            {[50, 100, 200, 500].map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => onChangeRandomSpeed(speed)}
                className={`px-2 py-0.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                  randomSpeedMs === speed
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-background border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {speed}ms
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};
