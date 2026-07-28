/**
 * Browser file download helper utilities.
 */

/**
 * Triggers a browser file download for a Blob object.
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();

  // Clean up
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Downloads multiple blobs individually with a slight delay between downloads to prevent browser blocking.
 */
export async function triggerMultipleDownloads(
  files: Array<{ blob: Blob; filename: string }>,
  signal?: AbortSignal
): Promise<void> {
  for (let i = 0; i < files.length; i++) {
    if (signal?.aborted) {
      throw new Error("Export operation cancelled by user.");
    }
    triggerBlobDownload(files[i].blob, files[i].filename);
    // Slight pause between programmatic downloads to prevent browser popup block
    if (i < files.length - 1) {
      await new Promise((res) => setTimeout(res, 250));
    }
  }
}
