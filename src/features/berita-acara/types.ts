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
}

export type UploadState = 'idle' | 'uploading' | 'ready' | 'error'
