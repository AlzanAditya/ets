export interface BeritaAcaraImage {
  id: string
  file: File
  previewUrl: string
  name: string
  size: number
  width: number
  height: number
  uploadedAt: string
  isLoading: boolean
  isPdfPage?: boolean
  pageNumber?: number
  totalPages?: number
}

export type UploadState = 'idle' | 'uploading' | 'ready' | 'error'
