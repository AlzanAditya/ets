import type { StickerItem } from "@/types/sticker";

export const randomizeSamples = {
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

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateRandomSerial(): string {
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

export function generateRandomProdNo(): string {
  const prefixes = ["", "PRD-", "BATCH-", "LOT-", "PN-", "LINE-", "IND-", "MAN-", "QC-"];
  const pref = getRandomItem(prefixes);
  const char1 = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const code = Math.floor(100 + Math.random() * 900);
  const char2 = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const num = Math.floor(10000 + Math.random() * 90000);

  return `${pref}${char1}${code}${char2}-${num}`;
}

export function generateRandomStickerItem(): StickerItem {
  return {
    productName: getRandomItem(randomizeSamples.productNames),
    serialNo: generateRandomSerial(),
    capacity: getRandomItem(randomizeSamples.capacities),
    prodNo: generateRandomProdNo(),
    voltage: getRandomItem(randomizeSamples.voltages),
    frequency: getRandomItem(randomizeSamples.frequencies),
    model: getRandomItem(randomizeSamples.models),
  };
}
