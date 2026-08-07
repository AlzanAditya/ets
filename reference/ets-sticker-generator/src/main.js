import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

/**
 * ETS Sticker Generator Core Engine
 * Pure Vanilla JavaScript
 */

// Cache QR SVG strings
const qrCache = new Map();

function generateQRCodeSVG(text) {
  if (!text) return "";
  if (qrCache.has(text)) return qrCache.get(text);

  let svg = "";
  QRCode.toString(
    text,
    {
      type: "svg",
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff"
      }
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

// Default Configuration State
const state = {
  // Product Data
  productName: "ETS-5.000.AIZ",
  serialNo: "XSI-II512-B-5000-1-0004",
  capacity: "5000 VA / 5 KVA",
  prodNo: "B312D-00004",
  voltage: "AC 220V",
  frequency: "50 Hz",
  model: "AIZ",

  // Geometry
  widthMm: 100,
  heightMm: 50,

  // A4 Layout
  marginMm: 10,
  hGapMm: 2,
  vGapMm: 2,
  copies: 10,
  pdfScale: 3,

  // UI State
  activeTab: "single", // 'single' | 'a4'
  zoomLevel: 100, // %
  isRandomizing: false,
  randomSpeedMs: 100
};

// DOM Elements
const elements = {
  // Inputs
  productNameInput: document.getElementById("input-product-name"),
  serialNoInput: document.getElementById("input-serial-no"),
  capacityInput: document.getElementById("input-capacity"),
  prodNoInput: document.getElementById("input-prod-no"),
  voltageInput: document.getElementById("input-voltage"),
  frequencyInput: document.getElementById("input-frequency"),
  modelInput: document.getElementById("input-model"),

  widthInput: document.getElementById("input-width"),
  heightInput: document.getElementById("input-height"),

  marginInput: document.getElementById("input-margin"),
  hGapInput: document.getElementById("input-hgap"),
  vGapInput: document.getElementById("input-vgap"),
  copiesInput: document.getElementById("input-copies"),
  pdfScaleSelect: document.getElementById("select-pdf-scale"),
  inputRandomSpeed: document.getElementById("input-random-speed"),

  // Stat Labels
  statCols: document.getElementById("stat-cols"),
  statRows: document.getElementById("stat-rows"),
  statCapacity: document.getElementById("stat-capacity"),
  statPages: document.getElementById("stat-pages"),

  // Containers
  singleStickerContainer: document.getElementById("single-sticker-container"),
  a4PagesContainer: document.getElementById("a4-pages-container"),
  singleStage: document.getElementById("single-stage"),
  canvasWrapper: document.querySelector(".canvas-wrapper"),

  // Buttons
  btnDownloadPdf: document.getElementById("btn-download-pdf"),
  btnPrint: document.getElementById("btn-print"),
  btnReset: document.getElementById("btn-reset"),
  btnRandomize: document.getElementById("btn-randomize"),
  btnRandomizeText: document.getElementById("btn-randomize-text"),
  tabSingle: document.getElementById("tab-single"),
  tabA4: document.getElementById("tab-a4"),
  paneSingle: document.getElementById("pane-single"),
  paneA4: document.getElementById("pane-a4"),

  zoomInBtn: document.getElementById("zoom-in"),
  zoomOutBtn: document.getElementById("zoom-out"),
  zoomResetBtn: document.getElementById("zoom-reset"),
  zoomFitBtn: document.getElementById("zoom-fit"),
  zoomValText: document.getElementById("zoom-val")
};

// Initialize Application
function init() {
  bindInputEvents();
  bindPresetEvents();
  bindTabEvents();
  bindZoomEvents();
  bindActionEvents();
  bindTouchEvents();
  bindSpeedEvents();

  syncInputsFromState();
  render();

  // Auto-fit preview on start and window resize
  setTimeout(() => {
    autoFitZoom();
  }, 100);

  window.addEventListener("resize", debounce(() => {
    autoFitZoom();
  }, 150));
}

// Debounce Utility
function debounce(fn, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  };
}

// Auto-Fit Zoom Calculation for Responsive Mobile/Desktop Preview
function autoFitZoom() {
  const wrapper = elements.canvasWrapper || document.querySelector(".canvas-wrapper");
  if (!wrapper) return;

  const padding = window.innerWidth <= 768 ? 16 : 32;
  const availableWidth = wrapper.clientWidth - padding;
  if (availableWidth <= 0) return;

  let contentWidthPx = 800; // A4 page (210mm @ 96DPI approx 794px + page borders)
  if (state.activeTab === "single") {
    contentWidthPx = Math.max(220, (state.widthMm * 3.7795) + 60);
  } else {
    contentWidthPx = 794 + 16;
  }

  const fitRatio = availableWidth / contentWidthPx;
  let fitPercent = Math.min(100, Math.max(20, Math.floor(fitRatio * 100)));

  state.zoomLevel = fitPercent;
  applyZoom();
}

// Touch Pinch-Zoom Handler for Mobile Viewports
function bindTouchEvents() {
  const wrapper = elements.canvasWrapper || document.querySelector(".canvas-wrapper");
  if (!wrapper) return;

  let initialDistance = 0;
  let initialZoom = 100;

  wrapper.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialDistance = Math.hypot(dx, dy);
      initialZoom = state.zoomLevel;
    }
  }, { passive: true });

  wrapper.addEventListener("touchmove", (e) => {
    if (e.touches.length === 2 && initialDistance > 0) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);

      if (currentDist > 0) {
        const scaleChange = currentDist / initialDistance;
        let newZoom = Math.round(initialZoom * scaleChange);
        newZoom = Math.min(250, Math.max(20, newZoom));
        state.zoomLevel = newZoom;
        applyZoom();
      }
    }
  }, { passive: true });

  wrapper.addEventListener("touchend", (e) => {
    if (e.touches.length < 2) {
      initialDistance = 0;
    }
  }, { passive: true });
}

// Sync Form Controls with State
function syncInputsFromState() {
  if (state.serialNo) state.serialNo = state.serialNo.replace(/\s+/g, "");
  if (elements.productNameInput) elements.productNameInput.value = state.productName;
  if (elements.serialNoInput) elements.serialNoInput.value = state.serialNo;
  if (elements.capacityInput) elements.capacityInput.value = state.capacity;
  if (elements.prodNoInput) elements.prodNoInput.value = state.prodNo;
  if (elements.voltageInput) elements.voltageInput.value = state.voltage;
  if (elements.frequencyInput) elements.frequencyInput.value = state.frequency;
  if (elements.modelInput) elements.modelInput.value = state.model;

  if (elements.widthInput) elements.widthInput.value = state.widthMm;
  if (elements.heightInput) elements.heightInput.value = state.heightMm;

  if (elements.marginInput) elements.marginInput.value = state.marginMm;
  if (elements.hGapInput) elements.hGapInput.value = state.hGapMm;
  if (elements.vGapInput) elements.vGapInput.value = state.vGapMm;
  if (elements.copiesInput) elements.copiesInput.value = state.copies;
  if (elements.pdfScaleSelect) elements.pdfScaleSelect.value = state.pdfScale;

  updatePresetChipHighlight();
}

// Bind Live Input Event Handlers
function bindInputEvents() {
  const inputMap = [
    [elements.productNameInput, "productName", "string"],
    [elements.serialNoInput, "serialNo", "string"],
    [elements.capacityInput, "capacity", "string"],
    [elements.prodNoInput, "prodNo", "string"],
    [elements.voltageInput, "voltage", "string"],
    [elements.frequencyInput, "frequency", "string"],
    [elements.modelInput, "model", "string"],

    [elements.widthInput, "widthMm", "number"],
    [elements.heightInput, "heightMm", "number"],

    [elements.marginInput, "marginMm", "number"],
    [elements.hGapInput, "hGapMm", "number"],
    [elements.vGapInput, "vGapMm", "number"],
    [elements.copiesInput, "copies", "number"],
    [elements.pdfScaleSelect, "pdfScale", "number"]
  ];

  inputMap.forEach(([el, key, type]) => {
    if (!el) return;
    const handler = () => {
      let val = el.value;
      if (key === "serialNo") {
        val = val.replace(/\s+/g, "");
        if (el.value !== val) {
          el.value = val;
        }
      }
      if (type === "number") {
        val = parseFloat(val);
        if (isNaN(val) || val < 0) val = 0;
      }
      state[key] = val;
      if (key === "widthMm" || key === "heightMm") {
        updatePresetChipHighlight();
        autoFitZoom();
      }
      render();
    };
    el.addEventListener("input", handler);
    el.addEventListener("change", handler);
  });

  if (elements.serialNoInput) {
    // Prevent typing space
    elements.serialNoInput.addEventListener("keydown", (e) => {
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
      }
    });

    // Strip spaces on paste or drop
    elements.serialNoInput.addEventListener("paste", (e) => {
      setTimeout(() => {
        if (elements.serialNoInput) {
          const cleaned = elements.serialNoInput.value.replace(/\s+/g, "");
          elements.serialNoInput.value = cleaned;
          state.serialNo = cleaned;
          render();
        }
      }, 0);
    });
  }
}

// Preset Chips
function bindPresetEvents() {
  const chips = document.querySelectorAll(".chip-btn");
  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      const w = parseFloat(chip.dataset.width);
      const h = parseFloat(chip.dataset.height);
      if (w && h) {
        state.widthMm = w;
        state.heightMm = h;
        if (elements.widthInput) elements.widthInput.value = w;
        if (elements.heightInput) elements.heightInput.value = h;
        updatePresetChipHighlight();
        render();
        autoFitZoom();
      }
    });
  });
}

function updatePresetChipHighlight() {
  const chips = document.querySelectorAll(".chip-btn");
  chips.forEach(chip => {
    const w = parseFloat(chip.dataset.width);
    const h = parseFloat(chip.dataset.height);
    if (w === state.widthMm && h === state.heightMm) {
      chip.classList.add("active");
    } else {
      chip.classList.remove("active");
    }
  });
}

// View Tabs
function bindTabEvents() {
  if (elements.tabSingle) {
    elements.tabSingle.addEventListener("click", () => switchTab("single"));
  }
  if (elements.tabA4) {
    elements.tabA4.addEventListener("click", () => switchTab("a4"));
  }
}

function switchTab(tab) {
  state.activeTab = tab;
  if (tab === "single") {
    elements.tabSingle.classList.add("active");
    elements.tabA4.classList.remove("active");
    elements.paneSingle.classList.add("active");
    elements.paneA4.classList.remove("active");
  } else {
    elements.tabA4.classList.add("active");
    elements.tabSingle.classList.remove("active");
    elements.paneA4.classList.add("active");
    elements.paneSingle.classList.remove("active");
  }
  autoFitZoom();
}

// Zoom Handlers
function bindZoomEvents() {
  if (elements.zoomInBtn) {
    elements.zoomInBtn.addEventListener("click", () => {
      state.zoomLevel = Math.min(250, state.zoomLevel + 10);
      applyZoom();
    });
  }
  if (elements.zoomOutBtn) {
    elements.zoomOutBtn.addEventListener("click", () => {
      state.zoomLevel = Math.max(20, state.zoomLevel - 10);
      applyZoom();
    });
  }
  if (elements.zoomResetBtn) {
    elements.zoomResetBtn.addEventListener("click", () => {
      state.zoomLevel = 100;
      applyZoom();
    });
  }
  if (elements.zoomFitBtn) {
    elements.zoomFitBtn.addEventListener("click", () => {
      autoFitZoom();
    });
  }
}

function applyZoom() {
  if (elements.zoomValText) {
    elements.zoomValText.textContent = `${state.zoomLevel}%`;
  }
  const scale = state.zoomLevel / 100;
  if (elements.singleStage) {
    elements.singleStage.style.transform = `scale(${scale})`;
  }
  if (elements.a4PagesContainer) {
    elements.a4PagesContainer.style.transform = `scale(${scale})`;
  }
}

// Speed Control Binding
function bindSpeedEvents() {
  if (elements.inputRandomSpeed) {
    elements.inputRandomSpeed.addEventListener("input", (e) => {
      let val = parseInt(e.target.value, 10);
      if (isNaN(val) || val < 10) val = 10;
      updateRandomSpeed(val);
    });
  }

  const speedChips = document.querySelectorAll(".speed-chip");
  speedChips.forEach(chip => {
    chip.addEventListener("click", () => {
      const speed = parseInt(chip.dataset.speed, 10);
      if (speed) {
        if (elements.inputRandomSpeed) elements.inputRandomSpeed.value = speed;
        updateRandomSpeed(speed);
      }
    });
  });
}

function updateRandomSpeed(speedMs) {
  state.randomSpeedMs = speedMs;

  const speedChips = document.querySelectorAll(".speed-chip");
  speedChips.forEach(chip => {
    if (parseInt(chip.dataset.speed, 10) === speedMs) {
      chip.classList.add("active");
    } else {
      chip.classList.remove("active");
    }
  });

  if (!state.isRandomizing && elements.btnRandomizeText) {
    elements.btnRandomizeText.textContent = `⚡ Live Demo (${speedMs}ms)`;
  }

  if (state.isRandomizing) {
    if (randomizeInterval) clearInterval(randomizeInterval);
    randomizeInterval = setInterval(randomizeTick, state.randomSpeedMs);
  }
}

// Randomize Engine (Configurable ms interval loop)
let randomizeInterval = null;

const randomizeSamples = {
  productNames: [
    "ETS-500.MINI", "ETS-800.COMPACT", "ETS-1.000.ECO", "ETS-1.200.ECO", "ETS-1.500.SLIM", "ETS-2.000.SLIM", 
    "ETS-2.500.MED", "ETS-3.000.AIZ", "ETS-3.500.AIZ", "ETS-4.000.AIZ", "ETS-4.500.AIZ", "ETS-5.000.AIZ", 
    "ETS-6.000.AIZ", "ETS-7.500.PRO", "ETS-8.000.PRO", "ETS-9.000.PRO", "ETS-10.000.MAX", "ETS-12.000.MAX", 
    "ETS-15.000.X1", "ETS-18.000.X1", "ETS-20.000.ULTRA", "ETS-25.000.ULTRA", "ETS-30.000.TURBO", "ETS-35.000.TURBO", 
    "ETS-40.000.TITAN", "ETS-45.000.TITAN", "ETS-50.000.TITAN", "ETS-60.000.POWER", "ETS-75.000.POWER", "ETS-100.000.MEGA", 
    "ETS-125.000.MEGA", "ETS-150.000.GIGA", "ETS-200.000.GIGA", "ETS-300.000.MATRIX", "ETS-400.000.MATRIX", "ETS-500.000.APEX", 
    "ETS-750.000.APEX", "ETS-1000.000.ZENITH", "ETS-NANO-100", "ETS-NANO-250", "ETS-SMART-500", "ETS-SMART-1000", 
    "ETS-DIGITAL-2000", "ETS-DIGITAL-3000", "ETS-VORTEX-4000", "ETS-HYBRID-5000", "ETS-HYBRID-7500", "ETS-INVERTER-10K", 
    "ETS-SOLAR-15K", "ETS-FORCE-20K", "ETS-KINETIC-25K", "ETS-SPECTRUM-30K", "ETS-DYNAMIC-40K", "ETS-QUANTUM-50K", 
    "ETS-FUSION-75K", "ETS-CYBER-100K", "ETS-ATOMIC-150K", "ETS-NEO-200K", "ETS-ALPHA-1K", "ETS-BETA-3K", 
    "ETS-GAMMA-5K", "ETS-DELTA-7K", "ETS-SIGMA-10K", "ETS-OMEGA-15K", "ETS-ZETA-20K", "ETS-PULSE-30K", 
    "ETS-ORBIT-50K", "ETS-CORE-100K", "ETS-XENON-200K", "ETS-TITANIUM-300K"
  ],
  models: [
    "AIZ", "PRO", "MAX", "X1", "ECO", "ULTRA", "LITE", "PLUS", "V2", "V3", "V4", "ST", "S2", "G3", "XT", 
    "GT", "NXT", "EVO", "FX", "RX", "TX", "HQ", "EX", "KR", "DB", "SH", "NX", "Z1", "Z2", "Z3", "R1", 
    "T1", "T2", "P1", "P2", "E1", "E2", "X2", "X3", "M1", "M2", "D1", "D2", "S1", "S2", "C1", "C2", 
    "K1", "K2", "F1", "F2", "N1", "N2", "U1", "U2", "H1", "H2", "L1", "L2", "W1", "W2", "Y1", "Y2", 
    "J1", "J2", "Q1", "Q2", "A1", "A2", "B1", "B2", "AIZ-PRO", "MAX-X1", "ECO-LITE", "EVO-ST", "NXT-GT", 
    "FX-RX", "HQ-EX", "DB-SH", "KR-NX", "Z1-PLUS"
  ],
  capacities: [
    "500 VA / 0.5 KVA", "800 VA / 0.8 KVA", "1000 VA / 1 KVA", "1200 VA / 1.2 KVA", "1500 VA / 1.5 KVA", "2000 VA / 2 KVA", 
    "2500 VA / 2.5 KVA", "3000 VA / 3 KVA", "3500 VA / 3.5 KVA", "4000 VA / 4 KVA", "4500 VA / 4.5 KVA", "5000 VA / 5 KVA", 
    "6000 VA / 6 KVA", "7500 VA / 7.5 KVA", "8000 VA / 8 KVA", "9000 VA / 9 KVA", "10000 VA / 10 KVA", "12000 VA / 12 KVA", 
    "15000 VA / 15 KVA", "18000 VA / 18 KVA", "20000 VA / 20 KVA", "25000 VA / 25 KVA", "30000 VA / 30 KVA", "35000 VA / 35 KVA", 
    "40000 VA / 40 KVA", "45000 VA / 45 KVA", "50000 VA / 50 KVA", "60000 VA / 60 KVA", "75000 VA / 75 KVA", "80000 VA / 80 KVA", 
    "100000 VA / 100 KVA", "125000 VA / 125 KVA", "150000 VA / 150 KVA", "200000 VA / 200 KVA", "250000 VA / 250 KVA", "300000 VA / 300 KVA", 
    "400000 VA / 400 KVA", "500000 VA / 500 KVA", "750000 VA / 750 KVA", "1000000 VA / 1 MVA", "1.25 MVA / 1250 KVA", "1.5 MVA / 1500 KVA", 
    "2 MVA / 2000 KVA", "2.5 MVA / 2500 KVA", "3 MVA / 3000 KVA", "5 MVA / 5000 KVA"
  ],
  voltages: [
    "AC 100V", "AC 110V", "AC 115V", "AC 120V", "AC 200V", "AC 208V", "AC 220V", "AC 230V", "AC 240V", "AC 277V", 
    "AC 380V", "AC 400V", "AC 415V", "AC 440V", "AC 460V", "AC 480V", "AC 600V", "AC 690V", "1-Phase 110V", "1-Phase 220V", 
    "1-Phase 230V", "1-Phase 240V", "3-Phase 200V", "3-Phase 208V", "3-Phase 220V", "3-Phase 380V", "3-Phase 400V", "3-Phase 415V", 
    "3-Phase 440V", "3-Phase 480V", "3-Phase 600V", "3-Phase 690V", "Dual 110/220V", "Dual 220/380V", "Wide 140-260V", "Wide 160-250V", 
    "High-Tol 220V±0.5%", "High-Tol 380V±1%", "DC 12V", "DC 24V", "DC 48V", "DC 110V", "DC 220V", "DC 380V", "DC 600V"
  ],
  frequencies: [
    "50 Hz", "60 Hz", "50/60 Hz", "50 Hz ±0.1%", "50 Hz ±0.5%", "60 Hz ±0.1%", "60 Hz ±0.5%", "50/60 Hz Auto", 
    "45 - 65 Hz", "40 - 70 Hz Wide", "400 Hz High-Freq", "16.7 Hz Rail", "20 - 100 Hz Inverter", "50/60/400 Hz Multi", 
    "50 Hz Synchronous", "60 Hz Pure Sine", "50 Hz Ultra-Stable", "60 Hz High-Precision"
  ]
};

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomSerial() {
  const prefixes = ["XSI", "ETS", "ZAN", "PDX", "SER", "KNT", "NXT", "GNR", "TTN", "FLX"];
  const prefix = getRandomItem(prefixes);
  const hex = Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, "0");
  const char = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const char2 = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const num1 = Math.floor(1000 + Math.random() * 9000);
  const num2 = Math.floor(1000 + Math.random() * 9000);

  const templates = [
    `${prefix}-${hex}-${char}-${num1}-1-${num2}`,
    `${prefix}-${char}${char2}-${num1}-${hex}`,
    `${prefix}-${num1}-${char}-${num2}-X`,
    `${prefix}-${hex}-${num2}-${char2}`
  ];
  return getRandomItem(templates);
}

function generateRandomProdNo() {
  const prefixes = ["", "PRD-", "BATCH-", "LOT-", "PN-", "LINE-", "IND-", "MAN-", "QC-"];
  const pref = getRandomItem(prefixes);
  const char1 = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const code = Math.floor(100 + Math.random() * 900);
  const char2 = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const num = Math.floor(10000 + Math.random() * 90000);

  return `${pref}${char1}${code}${char2}-${num}`;
}

function randomizeTick() {
  state.productName = getRandomItem(randomizeSamples.productNames);
  state.serialNo = generateRandomSerial();
  state.capacity = getRandomItem(randomizeSamples.capacities);
  state.prodNo = generateRandomProdNo();
  state.voltage = getRandomItem(randomizeSamples.voltages);
  state.frequency = getRandomItem(randomizeSamples.frequencies);
  state.model = getRandomItem(randomizeSamples.models);

  syncInputsFromState();
  render();
}

function toggleRandomize() {
  state.isRandomizing = !state.isRandomizing;

  if (state.isRandomizing) {
    if (elements.btnRandomize) elements.btnRandomize.classList.add("btn-randomize-active");
    if (elements.btnRandomizeText) elements.btnRandomizeText.textContent = "⏸ Stop Randomize";
    randomizeTick();
    randomizeInterval = setInterval(randomizeTick, state.randomSpeedMs || 100);
  } else {
    if (elements.btnRandomize) elements.btnRandomize.classList.remove("btn-randomize-active");
    if (elements.btnRandomizeText) elements.btnRandomizeText.textContent = `⚡ Live Demo (${state.randomSpeedMs || 100}ms)`;
    if (randomizeInterval) {
      clearInterval(randomizeInterval);
      randomizeInterval = null;
    }
  }
}

// Export to PDF Engine via jsPDF + html2canvas per page
async function exportToPDF() {
  if (state.isRandomizing) {
    toggleRandomize();
  }
  
  // Refresh layout
  render();

  const activeBtn = elements.btnDownloadPdf || elements.btnPrint;
  const originalHtml = activeBtn ? activeBtn.innerHTML : "";
  const selectedScale = parseInt(state.pdfScale, 10) || 3;

  if (activeBtn) {
    activeBtn.disabled = true;
    activeBtn.innerHTML = `
      <svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
      Menyiapkan PDF (${selectedScale}x)...
    `;
  }

  try {
    const pageElements = document.querySelectorAll("#a4-pages-container .a4-page");
    if (!pageElements || !pageElements.length) {
      alert("Tidak ada halaman A4 yang dapat dibuat PDF!");
      return;
    }

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true
    });

    const totalPages = pageElements.length;

    for (let i = 0; i < totalPages; i++) {
      const pageEl = pageElements[i];

      // Temporary isolate container attached to body for 1:1 render
      const tempWrapper = document.createElement("div");
      tempWrapper.style.position = "absolute";
      tempWrapper.style.top = "0";
      tempWrapper.style.left = "0";
      tempWrapper.style.width = "210mm";
      tempWrapper.style.height = "297mm";
      tempWrapper.style.boxSizing = "border-box";
      tempWrapper.style.background = "#ffffff";
      tempWrapper.style.zIndex = "-99999";
      tempWrapper.style.opacity = "0.01";
      tempWrapper.style.pointerEvents = "none";

      const clonedPage = pageEl.cloneNode(true);
      
      // Remove page count badge in output PDF
      clonedPage.querySelectorAll(".a4-page-badge").forEach(badge => badge.remove());

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

      // Render page to canvas at user-chosen scale (1x, 2x, 3x, 4x)
      const canvas = await html2canvas(clonedPage, {
        scale: selectedScale,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 794,
        windowHeight: 1123
      });

      document.body.removeChild(tempWrapper);

      const imgData = canvas.toDataURL("image/jpeg", 0.98);

      if (i > 0) {
        pdf.addPage("a4", "p");
      }

      pdf.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
    }

    const safeName = (state.productName || "ETS_Sticker").replace(/[^a-zA-Z0-9]/g, "_");
    const fileName = `ETS_Stickers_${safeName}_${state.copies}pcs.pdf`;

    pdf.save(fileName);
  } catch (err) {
    console.error("Gagal mengunduh PDF:", err);
    alert("Terjadi kesalahan saat mengunduh PDF: " + (err.message || err));
  } finally {
    if (activeBtn) {
      activeBtn.disabled = false;
      activeBtn.innerHTML = originalHtml;
    }
  }
}

// Actions
function bindActionEvents() {
  if (elements.btnDownloadPdf) {
    elements.btnDownloadPdf.addEventListener("click", exportToPDF);
  }

  if (elements.btnPrint) {
    elements.btnPrint.addEventListener("click", () => {
      if (state.isRandomizing) {
        toggleRandomize();
      }
      render();
      window.print();
    });
  }

  if (elements.btnRandomize) {
    elements.btnRandomize.addEventListener("click", toggleRandomize);
  }

  if (elements.btnReset) {
    elements.btnReset.addEventListener("click", () => {
      if (state.isRandomizing) {
        toggleRandomize();
      }
      state.productName = "ETS-5.000.AIZ";
      state.serialNo = "XSI-II512-B-5000-1-0004";
      state.capacity = "5000 VA / 5 KVA";
      state.prodNo = "B312D-00004";
      state.voltage = "AC 220V";
      state.frequency = "50 Hz";
      state.model = "AIZ";
      state.widthMm = 100;
      state.heightMm = 50;
      state.marginMm = 10;
      state.hGapMm = 2;
      state.vGapMm = 2;
      state.copies = 10;

      syncInputsFromState();
      render();
      autoFitZoom();
    });
  }
}

/**
 * Generate HTML string for single ETS Sticker Table (TRUTH)
 */
function createStickerHTML() {
  const qrUrl = `https://ets.zanxa.studio/p/${encodeURIComponent(state.serialNo || "")}`;
  const qrSvg = generateQRCodeSVG(qrUrl);

  return `
    <div class="ets-sticker" style="--sticker-w: ${state.widthMm}mm; --sticker-h: ${state.heightMm}mm;">
      <div class="ets-sticker-frame">
        <table class="ets-table">
          <colgroup>
            <col style="width: 9.58%" />
            <col style="width: 9.58%" />
            <col style="width: 9.58%" />
            <col style="width: 9.58%" />
            <col style="width: 9.58%" />
            <col style="width: 9.58%" />
            <col style="width: 6.67%" />
            <col style="width: 6.67%" />
            <col style="width: 6.67%" />
            <col style="width: 22.5%" />
          </colgroup>
          <tbody>
            <!-- ROW 1: HEADER & QR ROWSPAN (ON RIGHT) -->
            <tr class="ets-row-header">
              <td colspan="9" class="ets-cell-header">
                ELECTRICITY TREATMENT SYSTEM
              </td>
              <td rowspan="6" class="ets-cell-qr">
                <div class="ets-qr-wrapper">
                  <div class="ets-qr-scan-text">SCAN</div>
                  <div class="ets-qr-code">${qrSvg}</div>
                  <div class="ets-qr-list">
                    <div>✓ status garansi</div>
                    <div>✓ Spesifikasi</div>
                    <div>✓ Dokumentasi</div>
                    <div>✓ Laporan</div>
                  </div>
                </div>
              </td>
            </tr>

            <!-- ROW 2: PRODUCT NAME & MODEL ROWSPAN -->
            <tr class="ets-cell-data">
              <td colspan="6">
                <div class="ets-flex-field">
                  <span class="ets-lbl">Product Name.</span>
                  <span class="ets-val">${escapeHTML(state.productName)}</span>
                </div>
              </td>
              <td colspan="3" rowspan="2" class="ets-cell-model">
                <div class="ets-model-wrapper">
                  <div class="ets-model-label">Model.</div>
                  <div class="ets-model-val">${escapeHTML(state.model)}</div>
                </div>
              </td>
            </tr>

            <!-- ROW 3: SERIAL NO. -->
            <tr class="ets-cell-data">
              <td colspan="6">
                <div class="ets-flex-field">
                  <span class="ets-lbl">Serial No.</span>
                  <span class="ets-val ets-sn-val">${escapeHTML(state.serialNo)}</span>
                </div>
              </td>
            </tr>

            <!-- ROW 4: CAPACITY & 1-PHASE ROWSPAN -->
            <tr class="ets-cell-data">
              <td colspan="6">
                <div class="ets-flex-field">
                  <span class="ets-lbl">Capacity :</span>
                  <span class="ets-val">${escapeHTML(state.capacity)}</span>
                </div>
              </td>
              <td colspan="3" rowspan="2" class="ets-cell-phase">
                <div class="ets-phase-val">1-Phase</div>
              </td>
            </tr>

            <!-- ROW 5: PROD. NO -->
            <tr class="ets-cell-data">
              <td colspan="6">
                <div class="ets-flex-field">
                  <span class="ets-lbl">Prod. No :</span>
                  <span class="ets-val">${escapeHTML(state.prodNo)}</span>
                </div>
              </td>
            </tr>

            <!-- ROW 6: VOLTAGE & FREQUENCY / MADE IN INDONESIA -->
            <tr>
              <td colspan="4" class="ets-cell-vf">
                <div class="ets-vf-container">
                  <div class="ets-vf-row">
                    <span class="lbl">Voltage &nbsp;&nbsp;:</span>
                    <span class="val">${escapeHTML(state.voltage)}</span>
                  </div>
                  <div class="ets-vf-row">
                    <span class="lbl">Frequency :</span>
                    <span class="val">${escapeHTML(state.frequency)}</span>
                  </div>
                </div>
              </td>
              <td colspan="5" class="ets-cell-origin">
                <div class="ets-origin-val">Made in INDONESIA</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Main Render Controller
 */
function render() {
  // 1. Render Single Sticker
  if (elements.singleStickerContainer) {
    elements.singleStickerContainer.innerHTML = createStickerHTML();
  }

  // 2. Calculate A4 Capacity & Layout
  const a4WidthMm = 210;
  const a4HeightMm = 297;

  const margin = Math.max(0, state.marginMm);
  const hGap = Math.max(0, state.hGapMm);
  const vGap = Math.max(0, state.vGapMm);
  const w = Math.max(10, state.widthMm);
  const h = Math.max(10, state.heightMm);

  const printableW = a4WidthMm - 2 * margin;
  const printableH = a4HeightMm - 2 * margin;

  let cols = Math.floor((printableW + hGap) / (w + hGap));
  let rows = Math.floor((printableH + vGap) / (h + vGap));

  if (cols < 1) cols = 1;
  if (rows < 1) rows = 1;

  const capacityPerPage = cols * rows;
  const copies = Math.max(1, state.copies);
  const totalPages = Math.ceil(copies / capacityPerPage);

  // Update Stats UI
  if (elements.statCols) elements.statCols.textContent = `${cols} kolom`;
  if (elements.statRows) elements.statRows.textContent = `${rows} baris`;
  if (elements.statCapacity) elements.statCapacity.textContent = `${capacityPerPage} stiker/A4`;
  if (elements.statPages) elements.statPages.textContent = `${totalPages} Halaman (${copies} pcs)`;

  // 3. Render A4 Pages Grid
  if (elements.a4PagesContainer) {
    let pagesHTML = "";
    let remainingCopies = copies;

    for (let page = 1; page <= totalPages; page++) {
      const stickersOnThisPage = Math.min(remainingCopies, capacityPerPage);
      remainingCopies -= stickersOnThisPage;

      let rowsHTML = "";
      let stickerIndexInPage = 0;

      for (let r = 0; r < rows; r++) {
        if (stickerIndexInPage >= stickersOnThisPage) break;

        const isLastRowInGrid = (r === rows - 1) || (stickerIndexInPage + cols >= stickersOnThisPage);
        const bottomMargin = isLastRowInGrid ? 0 : vGap;

        let rowStickersHTML = "";

        for (let c = 0; c < cols; c++) {
          if (stickerIndexInPage >= stickersOnThisPage) break;

          const isRightmostCol = (c === cols - 1);
          const rightMargin = isRightmostCol ? 0 : hGap;

          rowStickersHTML += `
            <div class="ets-sticker-wrapper" style="
              width: ${w}mm;
              height: ${h}mm;
              flex: 0 0 ${w}mm;
              margin-right: ${rightMargin}mm;
              box-sizing: border-box;
            ">
              ${createStickerHTML()}
            </div>
          `;

          stickerIndexInPage++;
        }

        rowsHTML += `
          <div class="a4-row" style="
            height: ${h}mm;
            margin-bottom: ${bottomMargin}mm;
          ">
            ${rowStickersHTML}
          </div>
        `;
      }

      pagesHTML += `
        <div class="a4-page" style="padding: ${margin}mm;">
          <div class="a4-page-badge">Halaman ${page} dari ${totalPages}</div>
          <div class="a4-grid">
            ${rowsHTML}
          </div>
        </div>
      `;
    }

    elements.a4PagesContainer.innerHTML = pagesHTML;
  }
}

// Run Application on DOM Ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
