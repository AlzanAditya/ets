import React from 'react';
import { StickerConfig } from '../types';
import { DeferredNumberInput } from './DeferredNumberInput';
import { Settings, Grid, LayoutGrid, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface StickerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: StickerConfig;
  onUpdateConfig: <K extends keyof StickerConfig>(key: K, value: StickerConfig[K]) => void;
  onReset?: () => void;
}

const PRESET_SIZES = [
  { width: 60, height: 30, label: '60 × 30 mm' },
  { width: 100, height: 50, label: '100 × 50 mm' },
  { width: 120, height: 50, label: '120 × 50 mm' },
  { width: 110, height: 50, label: '110 × 50 mm' },
  { width: 80, height: 50, label: '80 × 50 mm' },
];

export const StickerSettingsModal: React.FC<StickerSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="max-w-md max-h-[90vh] flex flex-col bg-card text-card-foreground border-border overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <Settings className="size-5 text-primary" />
            Pengaturan Stiker & Layout Kertas
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Atur dimensi ukuran stiker dan margin/gap tata letak cetak pada kertas A4.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* 1. UKURAN STIKER (MM) */}
          <section className="bg-muted/40 border border-border rounded-xl p-3.5 flex flex-col gap-3">
            <h3 className="text-xs font-bold tracking-wider uppercase flex items-center gap-2 text-accent-foreground border-b border-border pb-2">
              <Grid className="size-4 text-accent-foreground" />
              Ukuran Stiker (mm)
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="modal-input-width" className="text-xs font-medium text-muted-foreground">
                  Width (mm)
                </label>
                <DeferredNumberInput
                  id="modal-input-width"
                  label="Width"
                  value={config.widthMm}
                  min={10}
                  max={250}
                  onCommit={(val) => onUpdateConfig('widthMm', val)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="modal-input-height" className="text-xs font-medium text-muted-foreground">
                  Height (mm)
                </label>
                <DeferredNumberInput
                  id="modal-input-height"
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
              <div className="flex flex-wrap gap-1.5">
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

          {/* 2. LAYOUT KERTAS (A4) */}
          <section className="bg-muted/40 border border-border rounded-xl p-3.5 flex flex-col gap-3">
            <h3 className="text-xs font-bold tracking-wider uppercase flex items-center gap-2 text-accent-foreground border-b border-border pb-2">
              <LayoutGrid className="size-4 text-accent-foreground" />
              Layout Kertas A4
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="modal-input-margin" className="text-xs font-medium text-muted-foreground">
                  Margin A4 (mm)
                </label>
                <DeferredNumberInput
                  id="modal-input-margin"
                  label="Margin A4"
                  value={config.marginMm}
                  min={0}
                  max={50}
                  onCommit={(val) => onUpdateConfig('marginMm', val)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="modal-input-copies" className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                  <span>Cetak per Item</span>
                  <span className="text-[10px] text-primary font-bold">(Pcs)</span>
                </label>
                <DeferredNumberInput
                  id="modal-input-copies"
                  label="Cetak per Item"
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
                <label htmlFor="modal-input-hgap" className="text-xs font-medium text-muted-foreground">
                  Gap Horisontal (mm)
                </label>
                <DeferredNumberInput
                  id="modal-input-hgap"
                  label="Gap Horisontal"
                  value={config.hGapMm}
                  min={0}
                  max={20}
                  onCommit={(val) => onUpdateConfig('hGapMm', val)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="modal-input-vgap" className="text-xs font-medium text-muted-foreground">
                  Gap Vertikal (mm)
                </label>
                <DeferredNumberInput
                  id="modal-input-vgap"
                  label="Gap Vertikal"
                  value={config.vGapMm}
                  min={0}
                  max={20}
                  onCommit={(val) => onUpdateConfig('vGapMm', val)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="modal-select-pdf-scale" className="text-xs font-medium text-muted-foreground">
                Skala Kualitas PDF (Resolusi/DPI)
              </label>
              <select
                id="modal-select-pdf-scale"
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
        </div>

        <DialogFooter className="pt-2">
          <Button type="button" onClick={onClose} className="w-full gap-1.5 text-xs font-bold">
            <Check className="size-4" />
            Selesai
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
