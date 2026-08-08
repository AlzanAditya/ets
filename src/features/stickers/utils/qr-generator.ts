import QRCode from 'qrcode';

const qrCache = new Map<string, string>();

/**
 * Generate QR code as SVG string synchronously or cached
 */
export function generateQRCodeSVG(text: string): string {
  if (!text) return '';
  if (qrCache.has(text)) {
    return qrCache.get(text)!;
  }

  let svg = '';
  // qrcode.toString supports callback or returns a Promise if no callback is passed
  QRCode.toString(
    text,
    {
      type: 'svg',
      errorCorrectionLevel: 'L',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    },
    (err, string) => {
      if (!err && string) {
        svg = string;
      }
    }
  );

  if (svg) {
    qrCache.set(text, svg);
  }

  return svg;
}
