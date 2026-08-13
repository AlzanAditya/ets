import React from 'react';
import { StickerData, StickerConfig, LayoutStats } from '../types';
import { EtsSticker } from './EtsSticker';

interface A4PrintLayoutStageProps {
  selectedProducts: StickerData[];
  currentSticker: StickerData;
  config: StickerConfig;
  layoutStats: LayoutStats;
  zoomLevel: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const A4PrintLayoutStage: React.FC<A4PrintLayoutStageProps> = ({
  selectedProducts,
  currentSticker,
  config,
  layoutStats,
  zoomLevel,
  containerRef,
}) => {
  const { cols, rows, capacityPerPage } = layoutStats;
  const margin = Math.max(0, config.marginMm);
  const hGap = Math.max(0, config.hGapMm);
  const vGap = Math.max(0, config.vGapMm);
  const w = Math.max(10, config.widthMm);
  const h = Math.max(10, config.heightMm);

  const copiesPerItem = Math.max(1, config.copies);
  const baseProducts =
    selectedProducts.length > 0 ? selectedProducts : [currentSticker];

  // Expand list: each selected product is repeated `copiesPerItem` times
  const allStickersToPrint = React.useMemo(() => {
    const list: StickerData[] = [];
    for (const prod of baseProducts) {
      for (let i = 0; i < copiesPerItem; i++) {
        list.push(prod);
      }
    }
    return list;
  }, [baseProducts, copiesPerItem]);

  const totalStickersCount = allStickersToPrint.length;
  const totalPages = Math.ceil(totalStickersCount / capacityPerPage) || 1;

  // Build Pages Array
  const pages = [];
  let stickerGlobalIndex = 0;

  for (let page = 1; page <= totalPages; page++) {
    const stickersOnThisPage = Math.min(
      totalStickersCount - stickerGlobalIndex,
      capacityPerPage
    );

    const pageRows = [];
    let stickerIndexInPage = 0;

    for (let r = 0; r < rows; r++) {
      if (stickerIndexInPage >= stickersOnThisPage) break;

      const isLastRowInGrid =
        r === rows - 1 || stickerIndexInPage + cols >= stickersOnThisPage;
      const bottomMargin = isLastRowInGrid ? 0 : vGap;

      const rowStickers = [];

      for (let c = 0; c < cols; c++) {
        if (stickerIndexInPage >= stickersOnThisPage) break;

        const isRightmostCol = c === cols - 1;
        const rightMargin = isRightmostCol ? 0 : hGap;

        const productForSticker = allStickersToPrint[stickerGlobalIndex];

        rowStickers.push(
          <div
            key={`sticker-${page}-${r}-${c}-${stickerGlobalIndex}`}
            className="ets-sticker-wrapper"
            style={{
              width: `${w}mm`,
              height: `${h}mm`,
              flex: `0 0 ${w}mm`,
              marginRight: `${rightMargin}mm`,
              boxSizing: 'border-box',
            }}
          >
            <EtsSticker data={productForSticker} widthMm={w} heightMm={h} />
          </div>
        );

        stickerIndexInPage++;
        stickerGlobalIndex++;
      }

      pageRows.push(
        <div
          key={`row-${page}-${r}`}
          className="a4-row"
          style={{
            height: `${h}mm`,
            marginBottom: `${bottomMargin}mm`,
          }}
        >
          {rowStickers}
        </div>
      );
    }

    pages.push(
      <div
        key={`a4-page-${page}`}
        className="a4-page"
        style={{ padding: `${margin}mm` }}
      >
        <div className="a4-page-badge">
          Halaman {page} dari {totalPages}
        </div>
        <div className="a4-grid">{pageRows}</div>
      </div>
    );
  }

  return (
    <div className="view-pane active flex flex-col items-center w-full">
      <div
        id="a4-pages-container"
        ref={containerRef}
        className="a4-container transition-transform duration-200"
        style={{
          transform: `scale(${zoomLevel / 100})`,
          transformOrigin: 'top center',
        }}
      >
        {pages}
      </div>
    </div>
  );
};
