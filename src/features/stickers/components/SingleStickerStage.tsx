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
    <div className="view-pane active flex flex-col items-center w-full">
      <div
        className="single-sticker-stage transition-transform duration-200"
        style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
      >
        <div className="flex items-center justify-between w-full px-2">
          <span className="stage-label text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Single Sticker Preview (1:1 Ratio)
          </span>

          {hasMultiple && (
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                disabled={activeProductIndex === 0}
                onClick={() => setActiveProductIndex(activeProductIndex - 1)}
                className="p-1 rounded bg-secondary text-secondary-foreground disabled:opacity-30"
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
                className="p-1 rounded bg-secondary text-secondary-foreground disabled:opacity-30"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          )}
        </div>

        <div id="single-sticker-container" className="flex items-center justify-center p-2">
          <EtsSticker
            data={currentSticker}
            widthMm={config.widthMm}
            heightMm={config.heightMm}
          />
        </div>
      </div>
    </div>
  );
};
