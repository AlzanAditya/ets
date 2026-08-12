export interface RenderPageOptions {
  width?: number
  height?: number
  scale?: number
  backgroundColor?: string
  /** Rendering profile for specialized document pipelines. */
  renderProfile?: 'default' | 'reports-bitmap'
}

export interface ExportPdfOptions {
  orientation?: 'landscape' | 'portrait'
  widthMm?: number
  heightMm?: number
  widthPx?: number
  heightPx?: number
  scale?: number
  filename?: string
  backgroundColor?: string
  /** Rendering profile for specialized document pipelines. */
  renderProfile?: 'default' | 'reports-bitmap'
}

export interface ExportPptxOptions {
  orientation?: 'landscape' | 'portrait'
  widthPx?: number
  heightPx?: number
  scale?: number
  filename?: string
  backgroundColor?: string
  jpegQuality?: number
  author?: string
  title?: string
  subject?: string
  company?: string
  layout?: 'LAYOUT_WIDE' | 'LAYOUT_16x9' | 'LAYOUT_4x3'
  slideWidthInches?: number
  slideHeightInches?: number
}

export type ExportDocumentFormat = 'pdf' | 'pptx'
