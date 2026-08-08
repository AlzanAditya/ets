import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

function convertOklchColor(str: string): string {
  if (!str || typeof str !== 'string' || !str.includes('oklch')) return str;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = str;
      return ctx.fillStyle;
    }
  } catch (e) {
    // fallback
  }
  return '#000000';
}

function sanitizeOklchInDoc(clonedDoc: Document): void {
  // 1. Sanitize all <style> tag content in cloned document
  clonedDoc.querySelectorAll('style').forEach((styleEl) => {
    if (styleEl.textContent && styleEl.textContent.includes('oklch')) {
      styleEl.textContent = styleEl.textContent.replace(/oklch\([^)]+\)/gi, (m) => {
        return convertOklchColor(m) || 'rgb(0,0,0)';
      });
    }
  });

  // 2. Sanitize element style attributes
  const allEls = clonedDoc.querySelectorAll<HTMLElement>('*');
  allEls.forEach((el) => {
    const styleAttr = el.getAttribute('style');
    if (styleAttr && styleAttr.includes('oklch')) {
      el.setAttribute(
        'style',
        styleAttr.replace(/oklch\([^)]+\)/gi, (m) => convertOklchColor(m) || '#000000')
      );
    }
  });
}

export async function exportA4PagesToPDF(
  containerElement: HTMLElement,
  pdfScale: number,
  fileNamePrefix: string,
  copiesCount: number
): Promise<void> {
  const pageElements = containerElement.querySelectorAll<HTMLElement>('.a4-page');
  if (!pageElements || !pageElements.length) {
    throw new Error('Tidak ada halaman A4 yang dapat dibuat PDF!');
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const totalPages = pageElements.length;
  const selectedScale = parseInt(String(pdfScale), 10) || 3;

  for (let i = 0; i < totalPages; i++) {
    const pageEl = pageElements[i];

    const tempWrapper = document.createElement('div');
    tempWrapper.style.position = 'absolute';
    tempWrapper.style.top = '0';
    tempWrapper.style.left = '0';
    tempWrapper.style.width = '210mm';
    tempWrapper.style.height = '297mm';
    tempWrapper.style.boxSizing = 'border-box';
    tempWrapper.style.background = '#ffffff';
    tempWrapper.style.zIndex = '-99999';
    tempWrapper.style.opacity = '0.01';
    tempWrapper.style.pointerEvents = 'none';

    const clonedPage = pageEl.cloneNode(true) as HTMLElement;

    clonedPage.querySelectorAll('.a4-page-badge').forEach((badge) => badge.remove());

    clonedPage.style.transform = 'none';
    clonedPage.style.margin = '0';
    clonedPage.style.boxShadow = 'none';
    clonedPage.style.border = 'none';
    clonedPage.style.width = '210mm';
    clonedPage.style.height = '297mm';
    clonedPage.style.boxSizing = 'border-box';
    clonedPage.style.background = '#ffffff';
    clonedPage.style.overflow = 'hidden';

    tempWrapper.appendChild(clonedPage);
    document.body.appendChild(tempWrapper);

    const canvas = await html2canvas(clonedPage, {
      scale: selectedScale,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 794,
      windowHeight: 1123,
      onclone: (clonedDoc) => {
        sanitizeOklchInDoc(clonedDoc);
      },
    });

    if (tempWrapper.parentNode) {
      document.body.removeChild(tempWrapper);
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    if (i > 0) {
      pdf.addPage('a4', 'p');
    }

    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  }

  const safeName = (fileNamePrefix || 'ETS_Sticker').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `ETS_Stickers_${safeName}_${copiesCount}pcs.pdf`;
  pdf.save(fileName);
}
