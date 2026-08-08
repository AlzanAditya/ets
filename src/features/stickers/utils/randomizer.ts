import { StickerData } from '../types';

export const randomizeSamples = {
  productNames: [
    'ETS-500.MINI', 'ETS-800.COMPACT', 'ETS-1.000.ECO', 'ETS-1.200.ECO', 'ETS-1.500.SLIM', 'ETS-2.000.SLIM',
    'ETS-2.500.MED', 'ETS-3.000.AIZ', 'ETS-3.500.AIZ', 'ETS-4.000.AIZ', 'ETS-4.500.AIZ', 'ETS-5.000.AIZ',
    'ETS-6.000.AIZ', 'ETS-7.500.PRO', 'ETS-8.000.PRO', 'ETS-9.000.PRO', 'ETS-10.000.MAX', 'ETS-12.000.MAX',
    'ETS-15.000.X1', 'ETS-18.000.X1', 'ETS-20.000.ULTRA', 'ETS-25.000.ULTRA', 'ETS-30.000.TURBO', 'ETS-35.000.TURBO',
    'ETS-40.000.TITAN', 'ETS-45.000.TITAN', 'ETS-50.000.TITAN', 'ETS-60.000.POWER', 'ETS-75.000.POWER', 'ETS-100.000.MEGA',
  ],
  models: [
    'AIZ', 'PRO', 'MAX', 'X1', 'ECO', 'ULTRA', 'LITE', 'PLUS', 'V2', 'V3', 'V4', 'ST', 'S2', 'G3', 'XT',
    'GT', 'NXT', 'EVO', 'FX', 'RX', 'TX', 'HQ', 'EX', 'KR', 'DB', 'SH', 'NX', 'Z1', 'Z2', 'Z3', 'R1',
  ],
  capacities: [
    '500 VA / 0.5 KVA', '800 VA / 0.8 KVA', '1000 VA / 1 KVA', '1200 VA / 1.2 KVA', '1500 VA / 1.5 KVA', '2000 VA / 2 KVA',
    '2500 VA / 2.5 KVA', '3000 VA / 3 KVA', '3500 VA / 3.5 KVA', '4000 VA / 4 KVA', '4500 VA / 4.5 KVA', '5000 VA / 5 KVA',
    '6000 VA / 6 KVA', '7500 VA / 7.5 KVA', '8000 VA / 8 KVA', '9000 VA / 9 KVA', '10000 VA / 10 KVA', '12000 VA / 12 KVA',
  ],
  voltages: [
    'AC 100V', 'AC 110V', 'AC 115V', 'AC 120V', 'AC 200V', 'AC 208V', 'AC 220V', 'AC 230V', 'AC 240V', 'AC 277V',
    'AC 380V', 'AC 400V', 'AC 415V', 'AC 440V', 'AC 460V', 'AC 480V', 'AC 600V', 'AC 690V', '1-Phase 110V', '1-Phase 220V',
  ],
  frequencies: [
    '50 Hz', '60 Hz', '50/60 Hz', '50 Hz ±0.1%', '50 Hz ±0.5%', '60 Hz ±0.1%', '60 Hz ±0.5%', '50/60 Hz Auto',
  ],
};

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomSerial(): string {
  const prefixes = ['XSI', 'ETS', 'ZAN', 'PDX', 'SER', 'KNT', 'NXT', 'GNR', 'TTN', 'FLX'];
  const prefix = getRandomItem(prefixes);
  const hex = Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0');
  const char = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const char2 = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const num1 = Math.floor(1000 + Math.random() * 9000);
  const num2 = Math.floor(1000 + Math.random() * 9000);
  const templates = [
    `${prefix}-${hex}-${char}-${num1}-1-${num2}`,
    `${prefix}-${char}${char2}-${num1}-${hex}`,
    `${prefix}-${num1}-${char}-${num2}-X`,
    `${prefix}-${hex}-${num2}-${char2}`,
  ];
  return getRandomItem(templates);
}

function generateRandomProdNo(): string {
  const prefixes = ['', 'PRD-', 'BATCH-', 'LOT-', 'PN-', 'LINE-', 'IND-', 'MAN-', 'QC-'];
  const pref = getRandomItem(prefixes);
  const char1 = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const code = Math.floor(100 + Math.random() * 900);
  const char2 = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const num = Math.floor(10000 + Math.random() * 90000);
  return `${pref}${char1}${code}${char2}-${num}`;
}

export function generateRandomStickerData(): StickerData {
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
