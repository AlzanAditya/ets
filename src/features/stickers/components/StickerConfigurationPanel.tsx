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
  className = "w-full bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono",
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
    <aside className="w-full flex flex-col gap-5 p-4 bg-slate-900 border-r border-slate-800/80 text-slate-100 overflow-y-auto">
      {/* 1. PRODUCT DATA SECTION */}
      <section className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-4 shadow-sm flex flex-col gap-3.5">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
          <h2 className="text-xs font-bold tracking-wider uppercase flex items-center gap-2 text-emerald-400">
            <Sliders className="size-4 text-emerald-400" />
            Data Produk ETS
          </h2>
          <button
            type="button"
            onClick={onOpenProductModal}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all flex items-center gap-1.5"
          >
            <Package className="size-3.5" />
            {selectedProducts.length > 0 ? `Pilih (${selectedProducts.length})` : 'Import dari Products'}
          </button>
        </div>

        {/* Selected Products Chips/List if Multi-Product */}
        {selectedProducts.length > 1 && (
          <div className="flex flex-col gap-1.5 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400">
              Produk Terpilih ({selectedProducts.length} Pcs):
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
              {selectedProducts.map((p, idx) => (
                <div
                  key={p.id || idx}
                  onClick={() => setActiveProductIndex(idx)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs cursor-pointer border transition-all ${
                    idx === activeProductIndex
                      ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-sm'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="truncate max-w-[110px]">{p.productName}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveProduct(idx);
                    }}
                    className="opacity-70 hover:opacity-100 hover:text-rose-400 transition-colors"
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
          <label htmlFor="input-product-name" className="text-xs font-medium text-slate-300">
            Product Name
          </label>
          <input
            type="text"
            id="input-product-name"
            value={currentSticker.productName}
            onChange={(e) => onUpdateCurrentSticker('productName', e.target.value)}
            placeholder="contoh: ETS-5.000.AIZ"
            className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center">
            <label htmlFor="input-serial-no" className="text-xs font-medium text-slate-300">
              Serial No.
            </label>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
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
            className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="input-capacity" className="text-xs font-medium text-slate-300">
              Capacity
            </label>
            <input
              type="text"
              id="input-capacity"
              value={currentSticker.capacity}
              onChange={(e) => onUpdateCurrentSticker('capacity', e.target.value)}
              placeholder="contoh: 5000 VA / 5 KVA"
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="input-prod-no" className="text-xs font-medium text-slate-300">
              Prod. No
            </label>
            <input
              type="text"
              id="input-prod-no"
              value={currentSticker.prodNo}
              onChange={(e) => onUpdateCurrentSticker('prodNo', e.target.value)}
              placeholder="contoh: B312D-00004"
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="input-voltage" className="text-xs font-medium text-slate-300">
              Voltage
            </label>
            <input
              type="text"
              id="input-voltage"
              value={currentSticker.voltage}
              onChange={(e) => onUpdateCurrentSticker('voltage', e.target.value)}
              placeholder="contoh: AC 220V"
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="input-frequency" className="text-xs font-medium text-slate-300">
              Frequency
            </label>
            <input
              type="text"
              id="input-frequency"
              value={currentSticker.frequency}
              onChange={(e) => onUpdateCurrentSticker('frequency', e.target.value)}
              placeholder="contoh: 50 Hz"
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="input-model" className="text-xs font-medium text-slate-300">
            Model
          </label>
          <input
            type="text"
            id="input-model"
            value={currentSticker.model}
            onChange={(e) => onUpdateCurrentSticker('model', e.target.value)}
            placeholder="contoh: AIZ"
            className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
          />
        </div>
      </section>

      {/* 2. STICKER SIZE SECTION */}
      <section className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-4 shadow-sm flex flex-col gap-3.5">
        <h2 className="text-xs font-bold tracking-wider uppercase flex items-center gap-2 text-emerald-400 border-b border-slate-800/80 pb-2.5">
          <Grid className="size-4 text-emerald-400" />
          Ukuran Stiker (mm)
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="input-width" className="text-xs font-medium text-slate-300">
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
            <label htmlFor="input-height" className="text-xs font-medium text-slate-300">
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
          <label className="text-xs font-medium text-slate-400">Preset Ukuran Populer:</label>
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
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                      : 'bg-slate-900 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
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
      <section className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-4 shadow-sm flex flex-col gap-3.5">
        <h2 className="text-xs font-bold tracking-wider uppercase flex items-center gap-2 text-emerald-400 border-b border-slate-800/80 pb-2.5">
          <LayoutGrid className="size-4 text-emerald-400" />
          Layout Kertas A4
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="input-margin" className="text-xs font-medium text-slate-300">
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
            <label htmlFor="input-copies" className="text-xs font-medium text-slate-300">
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
            <label htmlFor="input-hgap" className="text-xs font-medium text-slate-300">
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
            <label htmlFor="input-vgap" className="text-xs font-medium text-slate-300">
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
          <label htmlFor="select-pdf-scale" className="text-xs font-medium text-slate-300">
            Skala Kualitas PDF (Resolusi/DPI)
          </label>
          <select
            id="select-pdf-scale"
            value={config.pdfScale}
            onChange={(e) =>
              onUpdateConfig('pdfScale', parseInt(e.target.value, 10) || 3)
            }
            className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer font-medium"
          >
            <option value={1} className="bg-slate-900 text-slate-100">1x Scale (Draft / Cepat)</option>
            <option value={2} className="bg-slate-900 text-slate-100">2x Scale (Standard HD)</option>
            <option value={3} className="bg-slate-900 text-slate-100">3x Scale (Super Jernih - Default)</option>
            <option value={4} className="bg-slate-900 text-slate-100">4x Scale (Ultra HD / High-Res)</option>
          </select>
        </div>
      </section>

      {/* 4. LAYOUT CAPACITY SUMMARY */}
      <section className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5 space-y-2 text-xs">
        <div className="flex justify-between items-center text-slate-400">
          <span>Susunan Kolom:</span>
          <span className="font-semibold text-slate-200">{layoutStats.cols} kolom</span>
        </div>
        <div className="flex justify-between items-center text-slate-400">
          <span>Susunan Baris:</span>
          <span className="font-semibold text-slate-200">{layoutStats.rows} baris</span>
        </div>
        <div className="flex justify-between items-center text-slate-400">
          <span>Kapasitas 1 lembar A4:</span>
          <span className="font-bold text-emerald-400">{layoutStats.capacityPerPage} stiker/A4</span>
        </div>
        <div className="flex justify-between items-center text-slate-400">
          <span>Kebutuhan Kertas:</span>
          <span className="font-bold text-emerald-400">
            {layoutStats.totalPages} Halaman ({config.copies} pcs)
          </span>
        </div>
      </section>

      {/* DEMO / RANDOMIZE & RESET ACTIONS */}
      <div className="flex flex-col gap-2.5 pt-3 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleRandomize}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer ${
              isRandomizing
                ? 'bg-rose-500 text-white hover:bg-rose-600 animate-pulse'
                : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
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
            className="p-2.5 rounded-lg border border-slate-700/80 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
            title="Reset Data Ke Default Reference"
          >
            <RefreshCw className="size-4" />
          </button>
        </div>

        {/* Speed chips for demo */}
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>Speed:</span>
          <div className="flex gap-1">
            {[50, 100, 200, 500].map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => onChangeRandomSpeed(speed)}
                className={`px-2 py-0.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                  randomSpeedMs === speed
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
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
