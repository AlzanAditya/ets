import { StickerConfig, LayoutStats } from '../types';

export function calculateLayoutStats(config: StickerConfig, itemCount: number = 1): LayoutStats {
  const a4WidthMm = 210;
  const a4HeightMm = 297;

  const margin = Math.max(0, config.marginMm);
  const hGap = Math.max(0, config.hGapMm);
  const vGap = Math.max(0, config.vGapMm);
  const w = Math.max(10, config.widthMm);
  const h = Math.max(10, config.heightMm);

  const printableW = a4WidthMm - 2 * margin;
  const printableH = a4HeightMm - 2 * margin;

  let cols = Math.floor((printableW + hGap) / (w + hGap));
  let rows = Math.floor((printableH + vGap) / (h + vGap));

  if (cols < 1) cols = 1;
  if (rows < 1) rows = 1;

  const capacityPerPage = cols * rows;
  const copiesPerItem = Math.max(1, config.copies);
  const totalItems = Math.max(1, itemCount);
  const totalStickers = totalItems * copiesPerItem;
  const totalPages = Math.ceil(totalStickers / capacityPerPage) || 1;

  return {
    cols,
    rows,
    capacityPerPage,
    totalPages,
    totalStickers,
    totalItems,
  };
}
