export interface StepEvent {
  id: string
  step_type?: string
  name: string
  status: "completed" | "active" | "upcoming"
  completedAt?: string
  photos?: { id: string; url: string; caption?: string }[]
}

export interface WorkerJob {
  id: string
  eventId?: string
  mainEvent: "Instalasi" | "Maintenance"
  clientName: string
  clientLogo?: string
  clientPhone?: string
  clientAddress: string
  location: string
  serialNumber: string
  productName: string
  productCategory: string
  status: "active" | "scheduled" | "completed"
  scheduledDate: string
  scheduledTime: string
  currentStepIndex: number
  steps: StepEvent[]
  notes?: string
}

export interface HistoryItem {
  id: string
  mainEvent: "Instalasi" | "Maintenance"
  stepEvent: string
  clientName: string
  serialNumber: string
  address: string
  dateGroup: "Today" | "Yesterday" | string // "Hari Ini", "Kemarin", "28 Juli 2026"
  formattedDate: string
  time: string
  status: "completed" | "in_progress"
  lastUpdated?: string
  completedAt?: string
}

export interface WorkerProfileData {
  id: string
  workerCode: string
  name: string
  email: string
  phone: string
  position: string
  joinDate: string
  avatarUrl?: string
  totalTasksCompleted: number
  activeTasksCount: number
}

// ── Default Dummy Data ────────────────────────────────────────────────────────

export const defaultWorkerProfile: WorkerProfileData = {
  id: "wrk-001",
  workerCode: "WRK001",
  name: "Dika Pratama",
  email: "dika.pratama@ets.co.id",
  phone: "0812-3456-7890",
  position: "Teknisi Instalasi & Maintenance",
  joinDate: "01 Januari 2025",
  avatarUrl: "",
  totalTasksCompleted: 42,
  activeTasksCount: 1,
}

export const defaultCurrentJob: WorkerJob = {
  id: "job-101",
  mainEvent: "Instalasi",
  clientName: "PT Sinar Abadi Elektrik",
  clientLogo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&auto=format&fit=crop&q=80",
  clientPhone: "021-555-0192",
  clientAddress: "Gedung Utama Lt. 3, Jl. Jend. Sudirman No. 45, Jakarta Selatan",
  location: "Gedung A, Ruang Trafo Utama",
  serialNumber: "ETS-LV-2026-9041",
  productName: "Low Voltage Panel Switchgear 400V",
  productCategory: "Electrical Distribution Panel",
  status: "active",
  scheduledDate: "31 Juli 2026",
  scheduledTime: "08:30 WIB",
  currentStepIndex: 2, // 0: Delivery, 1: Persiapan, 2: Instalasi (active), 3: Pengujian, 4: Serah Terima
  steps: [
    { id: "s1", name: "Delivery", status: "completed", completedAt: "08:15 WIB" },
    { id: "s2", name: "Persiapan", status: "completed", completedAt: "09:30 WIB" },
    { id: "s3", name: "Instalasi", status: "active" },
    { id: "s4", name: "Pengujian", status: "upcoming" },
    { id: "s5", name: "Serah Terima", status: "upcoming" },
  ],
  notes: "Pastikan APD lengkap (Helm, Sarung Tangan Karet 10kV, Sepatu Safety). Koordinasi dengan Pak Budi (FM).",
}

export const defaultNextSchedules: WorkerJob[] = [
  {
    id: "job-102",
    mainEvent: "Maintenance",
    clientName: "CV Mega Power Nusantara",
    clientLogo: "",
    clientPhone: "021-789-4321",
    clientAddress: "Kawasan Industri Pulo Gadung Blok B4, Jakarta Timur",
    location: "Gardu Induk Blok B4",
    serialNumber: "ETS-MV-2025-1102",
    productName: "Medium Voltage Ring Main Unit (RMU)",
    productCategory: "High Voltage Equipment",
    status: "scheduled",
    scheduledDate: "01 Agustus 2026",
    scheduledTime: "09:00 WIB",
    currentStepIndex: 0,
    steps: [
      { id: "s101", name: "Pengecekan", status: "upcoming" },
      { id: "s102", name: "Report", status: "upcoming" },
    ],
  },
  {
    id: "job-103",
    mainEvent: "Instalasi",
    clientName: "PT Graha Utama Property",
    clientAddress: "Tower Apartemen Emerald Lt. B2, Jl. HR Rasuna Said, Jakarta",
    location: "Basement 2, Control Room",
    serialNumber: "ETS-CAP-2026-0044",
    productName: "Capacitor Bank Panel 400kVAR",
    productCategory: "Power Factor Corrector",
    status: "scheduled",
    scheduledDate: "02 Agustus 2026",
    scheduledTime: "13:00 WIB",
    currentStepIndex: 0,
    steps: [
      { id: "s201", name: "Delivery", status: "upcoming" },
      { id: "s202", name: "Persiapan", status: "upcoming" },
      { id: "s203", name: "Instalasi", status: "upcoming" },
      { id: "s204", name: "Pengujian", status: "upcoming" },
      { id: "s205", name: "Serah Terima", status: "upcoming" },
    ],
  },
  {
    id: "job-104",
    mainEvent: "Maintenance",
    clientName: "Hotel Santika Plaza",
    clientAddress: "Jl. Gajah Mada No. 12, Jakarta Barat",
    location: "Ruang Genset Utama",
    serialNumber: "ETS-GEN-2024-8810",
    productName: "Automatic Transfer Switch (ATS) 800A",
    productCategory: "Control System",
    status: "scheduled",
    scheduledDate: "04 Agustus 2026",
    scheduledTime: "10:00 WIB",
    currentStepIndex: 0,
    steps: [
      { id: "s301", name: "Pengecekan", status: "upcoming" },
      { id: "s302", name: "Report", status: "upcoming" },
    ],
  },
]

export const defaultTasks: WorkerJob[] = [
  defaultCurrentJob,
  ...defaultNextSchedules,
]

export const defaultHistoryItems: HistoryItem[] = [
  {
    id: "hist-1",
    mainEvent: "Instalasi",
    stepEvent: "Serah Terima",
    clientName: "PT Sinar Abadi Elektrik",
    serialNumber: "ETS-LV-2026-9041",
    address: "Jl. Jend. Sudirman No. 45, Jakarta",
    dateGroup: "Today",
    formattedDate: "Hari Ini",
    time: "14:30 WIB",
    status: "in_progress",
    lastUpdated: "14:30 WIB",
  },
  {
    id: "hist-2",
    mainEvent: "Maintenance",
    stepEvent: "Report",
    clientName: "PT Tirta Makmur Jaya",
    serialNumber: "ETS-PMP-2025-0988",
    address: "Jl. Raya Bogor KM 28, Depok",
    dateGroup: "Today",
    formattedDate: "Hari Ini",
    time: "11:15 WIB",
    status: "completed",
    completedAt: "11:15 WIB",
  },
  {
    id: "hist-3",
    mainEvent: "Instalasi",
    stepEvent: "Pengujian",
    clientName: "RS Mitra Sehat",
    serialNumber: "ETS-UPS-2026-3311",
    address: "Jl. Danau Sunter Utara No. 8, Jakarta Utara",
    dateGroup: "Yesterday",
    formattedDate: "Kemarin",
    time: "16:45 WIB",
    status: "completed",
    completedAt: "16:45 WIB",
  },
  {
    id: "hist-4",
    mainEvent: "Maintenance",
    stepEvent: "Pengecekan",
    clientName: "PT Astra Heavy Machinery",
    serialNumber: "ETS-PAN-2024-1290",
    address: "Kawasan EJIP Plot 5C, Cikarang",
    dateGroup: "Yesterday",
    formattedDate: "Kemarin",
    time: "10:00 WIB",
    status: "completed",
    completedAt: "10:00 WIB",
  },
  {
    id: "hist-5",
    mainEvent: "Instalasi",
    stepEvent: "Delivery",
    clientName: "Mall Kelapa Gading 3",
    serialNumber: "ETS-LV-2025-7762",
    address: "Jl. Boulevard Raya, Kelapa Gading",
    dateGroup: "28 Juli 2026",
    formattedDate: "28 Juli 2026",
    time: "15:20 WIB",
    status: "completed",
    completedAt: "15:20 WIB",
  },
]
