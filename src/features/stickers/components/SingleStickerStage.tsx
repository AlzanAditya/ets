import React from 'react';
import { StickerData, StickerConfig } from '../types';
import { EtsSticker } from './EtsSticker';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SingleStickerStageProps {
  currentSticker: StickerData;
  selectedProducts: StickerData[];
  activeProductIndex: number;
  setActiveProductIndex: (index: number) => void;
  config: StickerConfig;
  zoomLevel: number;
}

export const SingleStickerStage: React.FC<SingleStickerStageProps> = ({
  currentSticker,
  selectedProducts,
  activeProductIndex,
  setActiveProductIndex,
  config,
  zoomLevel,
}) => {
  const hasMultiple = selectedProducts.length > 1;

  return (
    <div className="view-pane active flex flex-col items-center w-full max-w-2xl gap-3">
      {/* Header Bar - Fixed outside zoom scale so it won't be affected */}
      <div className="flex items-center justify-between w-full px-1">
        <span className="stage-label text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Single Sticker Preview (1:1 Ratio)
        </span>

        {hasMultiple && (
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              disabled={activeProductIndex === 0}
              onClick={() => setActiveProductIndex(activeProductIndex - 1)}
              className="p-1 rounded bg-secondary text-secondary-foreground disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <span className="font-semibold text-foreground">
              {activeProductIndex + 1} / {selectedProducts.length}
            </span>
            <button
              type="button"
              disabled={activeProductIndex === selectedProducts.length - 1}
              onClick={() => setActiveProductIndex(activeProductIndex + 1)}
              className="p-1 rounded bg-secondary text-secondary-foreground disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Solo Sticker Container - Responsive full width with zoom scale */}
      <div
        className="single-sticker-stage w-full flex items-center justify-center transition-transform duration-200"
        style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
      >
        <div id="single-sticker-container" className="w-full flex items-center justify-center p-1 sm:p-2">
          <div className="w-full max-w-[650px] aspect-[2/1] rounded-xl overflow-hidden shadow-2xl bg-black border border-zinc-800">
            <EtsSticker
              data={currentSticker}
              widthMm={config.widthMm}
              heightMm={config.heightMm}
              className="!w-full !h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
