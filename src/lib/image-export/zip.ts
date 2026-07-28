import JSZip from "jszip";
import { FolderStrategy, ProcessedImageItem, ZipConfig } from "./types";
import { sanitizeName } from "./filename";

/**
 * Derives the internal zip folder path for an item based on ZipConfig folderStrategy.
 */
export function getZipPathForItem(
  item: ProcessedImageItem,
  strategy: FolderStrategy = "none"
): string {
  const eventFolder = sanitizeName(item.context?.event || "Event", "Event");
  const stepFolder = sanitizeName(item.context?.step || "Step", "Step");
  const fileName = item.fileName;

  switch (strategy) {
    case "event-step":
      return `${eventFolder}/${stepFolder}/${fileName}`;
    case "event":
      return `${eventFolder}/${fileName}`;
    case "step":
      return `${stepFolder}/${fileName}`;
    case "none":
    default:
      return fileName;
  }
}

/**
 * Bundles processed image items into a JSZip archive.
 */
export async function createZipArchive(
  items: ProcessedImageItem[],
  config?: ZipConfig,
  onProgress?: (percent: number, currentFile?: string) => void,
  signal?: AbortSignal
): Promise<{ zipBlob: Blob; zipName: string }> {
  if (signal?.aborted) {
    throw new Error("Export operation cancelled by user.");
  }

  const zip = new JSZip();
  const strategy = config?.folderStrategy || "none";
  const baseZipName = sanitizeName(config?.name || "Image_Export", "Image_Export");
  const zipName = baseZipName.toLowerCase().endsWith(".zip")
    ? baseZipName
    : `${baseZipName}.zip`;

  // Add each image blob to the zip with proper folder hierarchy
  for (let i = 0; i < items.length; i++) {
    if (signal?.aborted) {
      throw new Error("Export operation cancelled by user.");
    }
    const item = items[i];
    const path = getZipPathForItem(item, strategy);
    zip.file(path, item.blob);
  }

  // Generate JSZip Blob asynchronously
  const zipBlob = await zip.generateAsync(
    {
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      if (signal?.aborted) {
        throw new Error("Export operation cancelled by user.");
      }
      if (onProgress) {
        onProgress(Math.round(metadata.percent), metadata.currentFile || undefined);
      }
    }
  );

  return { zipBlob, zipName };
}
