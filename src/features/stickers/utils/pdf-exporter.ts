import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const canvas2d = typeof document !== "undefined" ? document.createElement("canvas") : null;
if (canvas2d) {
  canvas2d.width = 1;
  canvas2d.height = 1;
}
const ctx2d = canvas2d ? canvas2d.getContext("2d") : null;

function convertOklchColor(cssText: string): string {
  if (!cssText || !/(oklch|oklab|lab|lch)\(/i.test(cssText)) return cssText;

  return cssText.replace(/(oklch|oklab|lab|lch)\([^)]+\)/gi, (match) => {
    if (ctx2d) {
      try {
        ctx2d.fillStyle = "#000000";
        ctx2d.fillStyle = match;
        const res = ctx2d.fillStyle;
        if (res && !/(oklch|oklab|lab|lch)\(/i.test(res)) {
          return res;
        }
      } catch {
        // ignore
      }
    }
    return "#000000";
  });
}

function sanitizeOklchInDoc(clonedDoc: Document) {
  // 1. Sanitize all <style> element contents
  const styleEls = clonedDoc.querySelectorAll("style");
  styleEls.forEach((styleEl) => {
    if (styleEl.textContent && /(oklch|oklab|lab|lch)\(/i.test(styleEl.textContent)) {
      styleEl.textContent = convertOklchColor(styleEl.textContent);
    }
  });

  // 2. Sanitize all stylesheets if accessible
  try {
    const sheets = Array.from(clonedDoc.styleSheets);
    sheets.forEach((sheet) => {
      try {
        const rules = Array.from(sheet.cssRules || []);
        rules.forEach((rule: any) => {
          if (rule.style && rule.style.cssText && /(oklch|oklab|lab|lch)\(/i.test(rule.style.cssText)) {
            rule.style.cssText = convertOklchColor(rule.style.cssText);
          }
        });
      } catch {
        // ignore cross-origin sheet restriction
      }
    });
  } catch {
    // ignore
  }

  // 3. Sanitize inline style attributes on all elements
  const allEls = clonedDoc.querySelectorAll<HTMLElement>("*");
  allEls.forEach((el) => {
    const styleAttr = el.getAttribute("style");
    if (styleAttr && /(oklch|oklab|lab|lch)\(/i.test(styleAttr)) {
      el.setAttribute("style", convertOklchColor(styleAttr));
    }
  });
}

export async function exportA4PagesToPDF(
  pagesContainerSelector: string = "#a4-pages-container",
  fileNamePrefix: string = "ETS_Stickers",
  scale: number = 3
): Promise<void> {
  const container = document.querySelector(pagesContainerSelector);
  if (!container) {
    throw new Error("Elemen container A4 tidak ditemukan");
  }

  const pageElements = container.querySelectorAll<HTMLElement>(".a4-page");
  if (!pageElements || pageElements.length === 0) {
    throw new Error("Tidak ada halaman A4 yang dapat diekspor ke PDF!");
  }

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const totalPages = pageElements.length;

  for (let i = 0; i < totalPages; i++) {
    const pageEl = pageElements[i];

    // Fixed position container pinned at top-left of viewport to prevent scroll-offset displacement
    const tempWrapper = document.createElement("div");
    tempWrapper.style.position = "fixed";
    tempWrapper.style.top = "0";
    tempWrapper.style.left = "0";
    tempWrapper.style.width = "210mm";
    tempWrapper.style.height = "297mm";
    tempWrapper.style.boxSizing = "border-box";
    tempWrapper.style.background = "#ffffff";
    tempWrapper.style.zIndex = "-99999";
    tempWrapper.style.opacity = "0.01";
    tempWrapper.style.pointerEvents = "none";

    const clonedPage = pageEl.cloneNode(true) as HTMLElement;

    // Remove page count badges in output PDF
    clonedPage.querySelectorAll(".a4-page-badge").forEach((badge) => badge.remove());

    // Guarantee clean 1:1 A4 physical dimensions on clone
    clonedPage.style.transform = "none";
    clonedPage.style.margin = "0";
    clonedPage.style.boxShadow = "none";
    clonedPage.style.border = "none";
    clonedPage.style.width = "210mm";
    clonedPage.style.height = "297mm";
    clonedPage.style.boxSizing = "border-box";
    clonedPage.style.background = "#ffffff";
    clonedPage.style.overflow = "hidden";

    tempWrapper.appendChild(clonedPage);
    document.body.appendChild(tempWrapper);

    try {
      const canvas = await html2canvas(clonedPage, {
        scale: scale || 3,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 794,
        windowHeight: 1123,
        x: 0,
        y: 0,
        width: 794,
        height: 1123,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc: Document) => {
          sanitizeOklchInDoc(clonedDoc);
        },
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);

      if (i > 0) {
        pdf.addPage("a4", "portrait");
      }

      pdf.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
    } finally {
      if (document.body.contains(tempWrapper)) {
        document.body.removeChild(tempWrapper);
      }
    }
  }

  const safeName = (fileNamePrefix || "ETS_Stickers").replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `${safeName}.pdf`;

  pdf.save(fileName);
}
