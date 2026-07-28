import { ExportImageContext, FileNamingConfig, ProcessedImageItem } from "./types";

/**
 * Sanitizes a string for use in filenames or directory names across OS platforms.
 * Removes illegal characters: \ / : * ? " < > |
 */
export function sanitizeName(name: string, fallback = "unnamed"): string {
  if (!name || typeof name !== "string") return fallback;
  const cleaned = name
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ");
  return cleaned || fallback;
}

/**
 * Pads a number with leading zeros based on indexPadding length.
 * e.g., padIndex(1, 3) -> "001"
 */
export function padIndex(index: number, padding = 3): string {
  const numStr = String(Math.max(1, Math.floor(index)));
  return numStr.padStart(padding, "0");
}

/**
 * Generates formatted filename for an image item based on configuration template or callback.
 */
export function generateFilename(
  item: ProcessedImageItem,
  config?: FileNamingConfig,
  globalIndex = 1
): string {
  const ctx: ExportImageContext = {
    event: "Event",
    eventId: "",
    step: "Step",
    stepId: "",
    productCode: "",
    serialNumber: "",
    index: globalIndex,
    extension: item.extension || "jpg",
    ...item.context,
  };

  // If callback is provided, invoke it first
  if (config?.callback) {
    const customName = config.callback(item, ctx);
    if (customName && typeof customName === "string") {
      return sanitizeName(customName, `image_${globalIndex}.${ctx.extension}`);
    }
  }

  // Template handling
  const template = config?.template;
  if (template) {
    const paddedIndex = padIndex(ctx.index ?? globalIndex, config.indexPadding ?? 3);
    
    let result = template
      .replace(/\{event\}/gi, sanitizeName(ctx.event ?? "Event", "Event"))
      .replace(/\{eventId\}/gi, sanitizeName(ctx.eventId ?? "", ""))
      .replace(/\{step\}/gi, sanitizeName(ctx.step ?? "Step", "Step"))
      .replace(/\{stepId\}/gi, sanitizeName(ctx.stepId ?? "", ""))
      .replace(/\{productCode\}/gi, sanitizeName(ctx.productCode ?? "", ""))
      .replace(/\{serialNumber\}/gi, sanitizeName(ctx.serialNumber ?? "", ""))
      .replace(/\{index\}/gi, paddedIndex)
      .replace(/\{extension\}/gi, sanitizeName(ctx.extension ?? "jpg", "jpg"));

    // Ensure extension is at the end if not already present in the result
    const extSuffix = `.${ctx.extension || "jpg"}`;
    if (!result.toLowerCase().endsWith(extSuffix.toLowerCase())) {
      result = `${result}${extSuffix}`;
    }

    return sanitizeName(result, `image_${paddedIndex}.${ctx.extension}`);
  }

  // Fallback if no template or callback is given: use original fileName or index
  if (item.fileName) {
    const cleanFileName = sanitizeName(item.fileName);
    // If extension missing, append
    const ext = `.${ctx.extension || "jpg"}`;
    if (!cleanFileName.toLowerCase().endsWith(ext.toLowerCase())) {
      return `${cleanFileName}${ext}`;
    }
    return cleanFileName;
  }

  const paddedIndex = padIndex(globalIndex, config?.indexPadding ?? 3);
  return `image_${paddedIndex}.${ctx.extension || "jpg"}`;
}
