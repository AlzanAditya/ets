/**
 * Types and interfaces for Modular Image Export Utility
 */

export type PipelineStep = "download" | "convert:jpeg" | "zip" | string;

export type FolderStrategy = "none" | "step" | "event" | "event-step";

export interface ExportImageContext {
  event?: string;
  eventId?: string;
  step?: string;
  stepId?: string;
  productCode?: string;
  serialNumber?: string;
  index?: number;
  extension?: string;
  [key: string]: any;
}

export interface ExportImageInput {
  /** URL string (http/https/data/blob), Blob, or File object */
  source: string | Blob | File;
  /** Optional identifier for the image */
  id?: string;
  /** Original file name if available */
  fileName?: string;
  /** Context metadata used for naming templates and folder strategies */
  context?: ExportImageContext;
}

export interface ProcessedImageItem {
  id: string;
  blob: Blob;
  mimeType: string;
  extension: string;
  fileName: string;
  context: ExportImageContext;
  originalInput: ExportImageInput;
}

export interface FileNamingConfig {
  /** Template string with placeholders like "{event}-{step}_{stepId}_{index}" */
  template?: string;
  /** Zero padding length for index placeholder, e.g. 3 -> "001" */
  indexPadding?: number;
  /** Custom callback function overriding template naming */
  callback?: (image: ProcessedImageItem, context: ExportImageContext) => string;
}

export interface ZipConfig {
  /** Output zip filename without or with extension (e.g. "Installation Report") */
  name?: string;
  /** Hierarchy structure strategy inside the zip archive */
  folderStrategy?: FolderStrategy;
}

export type ExportStage =
  | "fetching"
  | "converting"
  | "zipping"
  | "downloading"
  | "complete"
  | "cancelled"
  | "error";

export interface ExportProgress {
  stage: ExportStage;
  currentFileIndex: number;
  totalFiles: number;
  currentFileName?: string;
  percentage: number;
  message?: string;
}

export interface ExportFailedItem {
  image: ExportImageInput;
  error: Error;
}

export interface ExportResult {
  success: boolean;
  totalImages: number;
  exportedCount: number;
  failedCount: number;
  failedItems: ExportFailedItem[];
  downloadName?: string;
}

export interface ExportImagesOptions {
  /** Array of image inputs to process */
  images: ExportImageInput[];
  /** Ordered list of pipeline processing steps */
  pipeline: PipelineStep[];
  /** Quality for JPEG conversion (0.0 - 1.0, default 0.9) */
  jpegQuality?: number;
  /** ZIP configuration if "zip" step is present */
  zip?: ZipConfig;
  /** File naming configuration for exported files */
  fileNaming?: FileNamingConfig;
  /** Progress callback */
  onProgress?: (progress: ExportProgress) => void;
  /** Success/Completion callback */
  onComplete?: (result: ExportResult) => void;
  /** Error callback for unhandled pipeline failure */
  onError?: (error: Error) => void;
  /** AbortSignal for cancellation support */
  signal?: AbortSignal;
}
