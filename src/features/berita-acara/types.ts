export interface PDFPageItem {
  id: string // Unique identifier for dnd-kit sortable
  originalIndex: number // 0-based page index from source PDF
  displayPageNumber: number // 1-based original page number (e.g., Page 1)
  thumbnailUrl?: string // Data URL rendered by PDF.js for preview
  width: number
  height: number
  rotation?: number
}

export interface WorkingPdfState {
  fileData: ArrayBuffer | null
  fileName: string
  fileSize: number
  totalPages: number
  pages: PDFPageItem[]
  originalPages: PDFPageItem[]
  deletedPages: PDFPageItem[]
  lastModified: number
}

export interface PagePreviewInfo {
  isOpen: boolean
  currentPageIndex: number // Index in the active pages array
}

export interface ExportProgressState {
  isExporting: boolean
  progress: number
  statusText: string
}
