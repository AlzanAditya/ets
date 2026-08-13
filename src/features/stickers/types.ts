export interface StickerData {
  id?: string;
  productName: string;
  serialNo: string;
  capacity: string;
  prodNo: string;
  voltage: string;
  frequency: string;
  model: string;
  clientName?: string;
}

export interface StickerConfig {
  widthMm: number;
  heightMm: number;
  marginMm: number;
  hGapMm: number;
  vGapMm: number;
  copies: number;
  pdfScale: number;
}

export type PreviewTab = 'single' | 'a4';

export interface LayoutStats {
  cols: number;
  rows: number;
  capacityPerPage: number;
  totalPages: number;
  totalStickers: number;
  totalItems: number;
}
