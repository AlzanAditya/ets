import type { A4LayoutSettings, A4Stats, StickerGeometry } from "@/types/sticker";

export function calculateA4Layout(
  settings: A4LayoutSettings,
  geometry: StickerGeometry,
  totalItemsCount?: number
): A4Stats {
  const a4WidthMm = 210;
  const a4HeightMm = 297;

  const margin = Math.max(0, settings.marginMm);
  const hGap = Math.max(0, settings.hGapMm);
  const vGap = Math.max(0, settings.vGapMm);
  const w = Math.max(10, geometry.widthMm);
  const h = Math.max(10, geometry.heightMm);

  const printableW = a4WidthMm - 2 * margin;
  const printableH = a4HeightMm - 2 * margin;

  let cols = Math.floor((printableW + hGap) / (w + hGap));
  let rows = Math.floor((printableH + vGap) / (h + vGap));

  if (cols < 1) cols = 1;
  if (rows < 1) rows = 1;

  const capacityPerPage = cols * rows;
  const copies = totalItemsCount ?? Math.max(1, settings.copies);
  const totalPages = Math.ceil(copies / capacityPerPage);

  return {
    cols,
    rows,
    capacityPerPage,
    totalPages,
    totalCopies: copies,
  };
}
