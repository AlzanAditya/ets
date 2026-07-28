/**
 * Canvas API client-side image conversion utilities.
 */

/**
 * Converts an image Blob or File to a JPEG Blob using HTML5 Canvas.
 */
export async function convertBlobToJpeg(
  sourceBlob: Blob,
  quality = 0.9,
  signal?: AbortSignal
): Promise<Blob> {
  if (signal?.aborted) {
    throw new Error("Export operation cancelled by user.");
  }

  // If already JPEG and no quality change requested or identical format, we still run canvas to normalize if required,
  // or re-encode to enforce requested quality.
  return new Promise<Blob>((resolve, reject) => {
    let objectUrl: string | null = null;

    const cleanup = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
    };

    if (signal?.aborted) {
      reject(new Error("Export operation cancelled by user."));
      return;
    }

    const onAbort = () => {
      cleanup();
      reject(new Error("Export operation cancelled by user."));
    };

    if (signal) {
      signal.addEventListener("abort", onAbort, { once: true });
    }

    try {
      objectUrl = URL.createObjectURL(sourceBlob);
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        if (signal?.aborted) {
          cleanup();
          reject(new Error("Export operation cancelled by user."));
          return;
        }

        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width || 800;
          canvas.height = img.naturalHeight || img.height || 600;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            cleanup();
            reject(new Error("Failed to get 2D canvas context for image conversion."));
            return;
          }

          // Fill white background for transparent PNG/WebP conversions
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);

          canvas.toBlob(
            (resultBlob) => {
              cleanup();
              if (signal?.aborted) {
                reject(new Error("Export operation cancelled by user."));
                return;
              }
              if (resultBlob) {
                resolve(resultBlob);
              } else {
                reject(new Error("Canvas toBlob failed to produce JPEG output."));
              }
            },
            "image/jpeg",
            Math.max(0.1, Math.min(1.0, quality))
          );
        } catch (err) {
          cleanup();
          reject(err instanceof Error ? err : new Error("Failed to render image on canvas."));
        }
      };

      img.onerror = () => {
        cleanup();
        reject(new Error("Failed to load image into Canvas for JPEG conversion."));
      };

      img.src = objectUrl;
    } catch (err) {
      cleanup();
      reject(err instanceof Error ? err : new Error("Error starting image conversion."));
    }
  });
}
