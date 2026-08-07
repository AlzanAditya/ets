import QRCode from "qrcode";

const qrCache = new Map<string, string>();

/**
 * Generate QR Code as inline SVG string
 */
export function generateQRCodeSVG(text: string): string {
  if (!text) return "";
  if (qrCache.has(text)) return qrCache.get(text)!;

  let svg = "";
  try {
    QRCode.toString(
      text,
      {
        type: "svg",
        margin: 1,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      },
      (err, string) => {
        if (!err && string) {
          svg = string;
        }
      }
    );
  } catch (e) {
    console.error("Error generating QR SVG:", e);
  }

  if (svg) {
    qrCache.set(text, svg);
  }
  return svg;
}

export function escapeHTML(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
