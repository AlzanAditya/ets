import { convertBlobToJpeg } from "./converters";
import { triggerBlobDownload, triggerMultipleDownloads } from "./download";
import { generateFilename, sanitizeName } from "./filename";
import { createZipArchive } from "./zip";
import type {
  ExportFailedItem,
  ExportImagesOptions,
  ExportProgress,
  ExportResult,
  ProcessedImageItem,
} from "./types";

/**
 * Helper to fetch or extract a Blob from various source types (URL, Blob, File).
 */
export async function fetchBlobFromSource(
  source: string | Blob | File,
  signal?: AbortSignal
): Promise<Blob> {
  if (signal?.aborted) {
    throw new Error("Export operation cancelled by user.");
  }

  if (typeof source !== "string") {
    return source as Blob;
  }

  if (typeof source === "string") {
    // If data URL
    if (source.startsWith("data:")) {
      const res = await fetch(source);
      return await res.blob();
    }

    // Standard HTTP/HTTPS or Blob URL
    const response = await fetch(source, { signal });
    if (!response.ok) {
      throw new Error(`Failed to fetch image source (HTTP ${response.status})`);
    }
    return await response.blob();
  }

  throw new Error("Invalid image source provided.");
}

/**
 * Infers file extension from MIME type or original filename/source string.
 */
export function inferExtension(mimeType: string, fileNameOrUrl?: string): string {
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("gif")) return "gif";
  if (mimeType.includes("svg")) return "svg";

  if (fileNameOrUrl && typeof fileNameOrUrl === "string") {
    const parts = fileNameOrUrl.split("?")[0].split("#")[0].split(".");
    if (parts.length > 1) {
      const ext = parts.pop()?.toLowerCase();
      if (ext && ext.length <= 4) return ext;
    }
  }

  return "jpg";
}

/**
 * Main execution function for the image export pipeline.
 */
export async function runExportPipeline(options: ExportImagesOptions): Promise<ExportResult> {
  const {
    images,
    pipeline,
    jpegQuality = 0.9,
    zip: zipConfig,
    fileNaming,
    onProgress,
    onComplete,
    onError,
    signal,
  } = options;

  const totalFiles = images.length;
  const failedItems: ExportFailedItem[] = [];
  const processedItems: ProcessedImageItem[] = [];

  const updateProgress = (
    stage: ExportProgress["stage"],
    currentFileIndex: number,
    percentage: number,
    currentFileName?: string,
    message?: string
  ) => {
    if (onProgress) {
      onProgress({
        stage,
        currentFileIndex,
        totalFiles,
        currentFileName,
        percentage: Math.min(100, Math.max(0, Math.round(percentage))),
        message,
      });
    }
  };

  try {
    if (!images || images.length === 0) {
      const emptyResult: ExportResult = {
        success: true,
        totalImages: 0,
        exportedCount: 0,
        failedCount: 0,
        failedItems: [],
      };
      updateProgress("complete", 0, 100, undefined, "No images to process.");
      if (onComplete) onComplete(emptyResult);
      return emptyResult;
    }

    if (signal?.aborted) {
      throw new Error("Export operation cancelled by user.");
    }

    const hasConvertJpeg = pipeline.some((p) => p.toLowerCase() === "convert:jpeg");
    const hasZip = pipeline.some((p) => p.toLowerCase() === "zip");
    const hasDownload = pipeline.some((p) => p.toLowerCase() === "download");

    // STAGE 1: Fetch Blobs & Initial Conversion
    updateProgress("fetching", 0, 0, undefined, "Preparing image files...");

    for (let i = 0; i < images.length; i++) {
      if (signal?.aborted) {
        throw new Error("Export operation cancelled by user.");
      }

      const input = images[i];
      const fileNameHint =
        input.fileName ||
        (typeof input.source === "string" ? input.source : "image");

      updateProgress(
        hasConvertJpeg ? "converting" : "fetching",
        i + 1,
        (i / totalFiles) * (hasConvertJpeg ? 50 : 80),
        fileNameHint,
        `Processing file ${i + 1} of ${totalFiles}`
      );

      try {
        // 1. Fetch raw blob
        let blob = await fetchBlobFromSource(input.source, signal);
        let mimeType = blob.type || "image/jpeg";
        let extension = inferExtension(mimeType, fileNameHint);

        // 2. Convert to JPEG if required in pipeline
        if (hasConvertJpeg) {
          blob = await convertBlobToJpeg(blob, jpegQuality, signal);
          mimeType = "image/jpeg";
          extension = "jpg";
        }

        const id = input.id || `img_${i + 1}_${Date.now()}`;
        const context = { ...input.context, extension, index: i + 1 };

        const tempItem: ProcessedImageItem = {
          id,
          blob,
          mimeType,
          extension,
          fileName: "",
          context,
          originalInput: input,
        };

        // 3. Generate sanitized final filename
        tempItem.fileName = generateFilename(tempItem, fileNaming, i + 1);

        processedItems.push(tempItem);
      } catch (err) {
        console.warn(`Failed to process image ${i + 1}:`, err);
        failedItems.push({
          image: input,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      }
    }

    if (signal?.aborted) {
      throw new Error("Export operation cancelled by user.");
    }

    if (processedItems.length === 0) {
      const error = new Error("All images failed to process or load.");
      updateProgress("error", totalFiles, 100, undefined, error.message);
      if (onError) onError(error);
      const failedResult: ExportResult = {
        success: false,
        totalImages: totalFiles,
        exportedCount: 0,
        failedCount: failedItems.length,
        failedItems,
      };
      if (onComplete) onComplete(failedResult);
      return failedResult;
    }

    let downloadName: string | undefined;

    // STAGE 2: ZIP bundling if in pipeline
    if (hasZip) {
      const baseZipName = sanitizeName(zipConfig?.name || "Image_Export", "Image_Export");
      const targetZipName = baseZipName.toLowerCase().endsWith(".zip")
        ? baseZipName
        : `${baseZipName}.zip`;

      updateProgress("zipping", processedItems.length, 85, targetZipName, "Creating ZIP archive...");

      const { zipBlob, zipName } = await createZipArchive(
        processedItems,
        zipConfig,
        (percent) => {
          updateProgress(
            "zipping",
            processedItems.length,
            85 + percent * 0.1,
            targetZipName,
            `Compressing into ${targetZipName}...`
          );
        },
        signal
      );

      downloadName = zipName;

      if (hasDownload) {
        updateProgress("downloading", processedItems.length, 98, zipName, "Starting download...");
        triggerBlobDownload(zipBlob, zipName);
      }
    } else if (hasDownload) {
      // STAGE 2 (No Zip): Download individual files
      updateProgress("downloading", processedItems.length, 90, undefined, "Downloading images...");
      const filesToDownload = processedItems.map((item) => ({
        blob: item.blob,
        filename: item.fileName,
      }));
      await triggerMultipleDownloads(filesToDownload, signal);
    }

    // Complete
    updateProgress("complete", processedItems.length, 100, downloadName, "Export completed.");

    const finalResult: ExportResult = {
      success: true,
      totalImages: totalFiles,
      exportedCount: processedItems.length,
      failedCount: failedItems.length,
      failedItems,
      downloadName,
    };

    if (onComplete) {
      onComplete(finalResult);
    }

    return finalResult;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    const isCancelled = error.message.includes("cancelled");

    if (isCancelled) {
      updateProgress("cancelled", 0, 0, undefined, "Export process cancelled.");
    } else {
      updateProgress("error", 0, 0, undefined, error.message);
      if (onError) onError(error);
    }

    const errorResult: ExportResult = {
      success: false,
      totalImages: totalFiles,
      exportedCount: processedItems.length,
      failedCount: failedItems.length + (totalFiles - processedItems.length - failedItems.length),
      failedItems,
    };

    return errorResult;
  }
}
