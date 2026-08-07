import React, { useMemo } from "react";
import type { StickerItem, StickerGeometry, A4LayoutSettings, A4Stats } from "@/types/sticker";
import { EtsSticker } from "./EtsSticker";

interface A4PrintLayoutProps {
  items: StickerItem[];
  geometry: StickerGeometry;
  settings: A4LayoutSettings;
  stats: A4Stats;
}

export const A4PrintLayout: React.FC<A4PrintLayoutProps> = ({
  items,
  geometry,
  settings,
  stats,
}) => {
  const { marginMm, hGapMm, vGapMm } = settings;
  const { widthMm, heightMm } = geometry;
  const { cols, rows, capacityPerPage, totalPages } = stats;

  // Build pages list
  const pages = useMemo(() => {
    const pageList: { pageNumber: number; stickerItems: StickerItem[] }[] = [];
    let remainingItems = [...items];

    for (let p = 1; p <= totalPages; p++) {
      const pageStickers = remainingItems.slice(0, capacityPerPage);
      remainingItems = remainingItems.slice(capacityPerPage);
      pageList.push({
        pageNumber: p,
        stickerItems: pageStickers,
      });
    }

    return pageList;
  }, [items, totalPages, capacityPerPage]);

  return (
    <div id="a4-pages-container" className="a4-container">
      {pages.map((page) => {
        let stickerIdxInPage = 0;
        const pageRows: React.ReactNode[] = [];

        for (let r = 0; r < rows; r++) {
          if (stickerIdxInPage >= page.stickerItems.length) break;

          const isLastRow =
            r === rows - 1 || stickerIdxInPage + cols >= page.stickerItems.length;
          const bottomMargin = isLastRow ? 0 : vGapMm;

          const rowStickers: React.ReactNode[] = [];

          for (let c = 0; c < cols; c++) {
            if (stickerIdxInPage >= page.stickerItems.length) break;

            const isRightmostCol = c === cols - 1;
            const rightMargin = isRightmostCol ? 0 : hGapMm;
            const item = page.stickerItems[stickerIdxInPage];

            rowStickers.push(
              <div
                key={`s-${page.pageNumber}-${r}-${c}-${stickerIdxInPage}`}
                className="ets-sticker-wrapper"
                style={{
                  width: `${widthMm}mm`,
                  height: `${heightMm}mm`,
                  flex: `0 0 ${widthMm}mm`,
                  marginRight: `${rightMargin}mm`,
                  boxSizing: "border-box",
                }}
              >
                <EtsSticker item={item} geometry={geometry} />
              </div>
            );

            stickerIdxInPage++;
          }

          pageRows.push(
            <div
              key={`row-${page.pageNumber}-${r}`}
              className="a4-row"
              style={{
                height: `${heightMm}mm`,
                marginBottom: `${bottomMargin}mm`,
              }}
            >
              {rowStickers}
            </div>
          );
        }

        return (
          <div
            key={`page-${page.pageNumber}`}
            className="a4-page"
            style={{ padding: `${marginMm}mm` }}
          >
            <div className="a4-page-badge">
              Halaman {page.pageNumber} dari {totalPages}
            </div>
            <div className="a4-grid">{pageRows}</div>
          </div>
        );
      })}
    </div>
  );
};
