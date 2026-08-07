export interface StickerItem {
  id?: string;
  productName: string;
  serialNo: string;
  capacity: string;
  prodNo: string;
  voltage: string;
  frequency: string;
  model: string;
}

export interface StickerGeometry {
  widthMm: number;
  heightMm: number;
}

export interface A4LayoutSettings {
  marginMm: number;
  hGapMm: number;
  vGapMm: number;
  copies: number; // For single item repeat count, or overridden if multiple queue items
  pdfScale: number; // 1 | 2 | 3 | 4
}

export interface A4Stats {
  cols: number;
  rows: number;
  capacityPerPage: number;
  totalPages: number;
  totalCopies: number;
}

export interface StickerPreset {
  width: number;
  height: number;
  label: string;
}

export type StickerTabMode = "single" | "a4";
