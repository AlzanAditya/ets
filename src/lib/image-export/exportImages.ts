import { runExportPipeline } from "./pipeline";
import { ExportImagesOptions, ExportResult } from "./types";

/**
 * Main exportImages utility.
 * Process image exports according to a configurable pipeline.
 *
 * Supported Pipelines:
 * - ["download"] (Original Download)
 * - ["convert:jpeg", "download"] (JPEG Download)
 * - ["zip", "download"] (ZIP Original)
 * - ["convert:jpeg", "zip", "download"] (JPEG ZIP)
 */
export async function exportImages(options: ExportImagesOptions): Promise<ExportResult> {
  if (!options || !Array.isArray(options.images)) {
    throw new Error("exportImages requires an 'images' array parameter.");
  }
  if (!Array.isArray(options.pipeline) || options.pipeline.length === 0) {
    throw new Error("exportImages requires a non-empty 'pipeline' array.");
  }

  return runExportPipeline(options);
}

export default exportImages;
