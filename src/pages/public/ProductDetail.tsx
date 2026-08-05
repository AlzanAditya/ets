import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Tag,
  Zap,
  ArrowLeft,
  Wrench,
  Download,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileCode,
  Cpu,
  Calendar,
  Gauge,
  Power,
  Radio,
  Plug,
  Shield,
  Cable,
  Image as ImageIcon,
  FileText,
  Hexagon,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { PublicHeader } from "./components/PublicHeader";
import { QrScannerModal } from "./components/QrScannerModal";
import { PublicQrCodeCard } from "./components/PublicQrCodeCard";
import { PublicEventAccordion } from "./components/PublicEventAccordion";
import { PublicReportCard } from "./components/PublicReportCard";
import { productsService, type ProductWithRelations } from "@/services/products.service";
import { productEventsService, type ProductEventData, STEP_TYPE_TITLES } from "@/services/product-events.service";
import { getClientAvatarUrl } from "@/lib/image-service";
import { exportImages } from "@/lib/image-export";
import { toast } from "sonner";

function getClientInitials(name?: string): string {
  if (!name || !name.trim()) return "CL";
  const cleaned = name
    .trim()
    .replace(/^(PT\.?|CV\.?|UD\.?|PD\.?|TB\.?|FIRMA)\s+/i, "")
    .trim();
  if (!cleaned) return name.slice(0, 2).toUpperCase();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function SpecDetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | number | null;
}) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="p-2.5 sm:p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-start gap-2.5">
      {Icon && (
        <Icon className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block truncate">
          {label}
        </span>
        <span className="text-xs sm:text-sm font-semibold text-zinc-100 font-mono break-all block mt-0.5 leading-snug">
          {String(value)}
        </span>
      </div>
    </div>
  );
}

export default function PublicProductDetail() {
  const { serial_number } = useParams<{ serial_number: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = React.useState<ProductWithRelations | null>(null);
  const [events, setEvents] = React.useState<ProductEventData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [isExportingAll, setIsExportingAll] = React.useState(false);
  const [isSpecExpanded, setIsSpecExpanded] = React.useState(true);
  const [isReportExpanded, setIsReportExpanded] = React.useState(true);
  const [isQrExpanded, setIsQrExpanded] = React.useState(true);
  const [clientAvatarError, setClientAvatarError] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState<string>("identitas");
  const isManualScrollingRef = React.useRef(false);
  const manualScrollTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const scrollToSection = (id: string, expandFn?: () => void) => {
    if (expandFn) {
      expandFn();
    }
    
    // Lock scroll observer to prevent intermediate state changes during smooth scrolling
    isManualScrollingRef.current = true;
    setActiveSection(id);

    if (manualScrollTimerRef.current) {
      clearTimeout(manualScrollTimerRef.current);
    }

    manualScrollTimerRef.current = setTimeout(() => {
      isManualScrollingRef.current = false;
    }, 900);

    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  };

  const navItems = [
    {
      id: "identitas",
      label: "Identitas",
      onClick: () => scrollToSection("identitas"),
    },
    {
      id: "spesifikasi",
      label: "Spesifikasi",
      onClick: () => scrollToSection("spesifikasi", () => setIsSpecExpanded(true)),
    },
    {
      id: "laporan",
      label: "Laporan",
      onClick: () => scrollToSection("laporan", () => setIsReportExpanded(true)),
    },
    {
      id: "dokumentasi",
      label: "Dokumentasi",
      onClick: () => scrollToSection("dokumentasi"),
    },
    {
      id: "kode-qr",
      label: "Kode QR",
      onClick: () => scrollToSection("kode-qr", () => setIsQrExpanded(true)),
    },
  ];

  // Observe active section when scrolling
  React.useEffect(() => {
    if (!product) return;

    const sectionIds = ["identitas", "spesifikasi", "laporan", "dokumentasi", "kode-qr"];

    const handleScroll = () => {
      if (isManualScrollingRef.current) return;

      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollY = window.scrollY;

      // Bottom of page check
      if (scrollY + windowHeight >= documentHeight - 60) {
        setActiveSection("kode-qr");
        return;
      }

      // Check offset top of each section
      const headerOffset = 100; // Trigger point slightly below header
      let currentSection = "identitas";

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          // If section top is above headerOffset or inside upper viewport
          if (rect.top <= headerOffset) {
            currentSection = id;
          }
        }
      }

      setActiveSection(currentSection);
    };

    const handleUserInterrupt = () => {
      if (isManualScrollingRef.current) {
        isManualScrollingRef.current = false;
        if (manualScrollTimerRef.current) {
          clearTimeout(manualScrollTimerRef.current);
        }
      }
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("wheel", handleUserInterrupt, { passive: true });
    window.addEventListener("touchmove", handleUserInterrupt, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("wheel", handleUserInterrupt);
      window.removeEventListener("touchmove", handleUserInterrupt);
    };
  }, [product]);

  // Load product & events from Supabase by serial_number
  React.useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!serial_number) {
        if (isMounted) setNotFound(true);
        return;
      }

      try {
        setLoading(true);
        setNotFound(false);

        const prod = await productsService.getProductBySerial(serial_number);
        if (!prod) {
          if (isMounted) setNotFound(true);
          return;
        }

        if (isMounted) setProduct(prod);

        // Fetch events
        const evts = await productEventsService.getProductEvents(prod.product_id);
        if (isMounted) setEvents(evts || []);

      } catch (err) {
        console.error("Failed to load public product detail:", err);
        if (isMounted) setNotFound(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [serial_number]);

  // Determine status
  const isMaintenance = product?.status === "maintenance";
  const totalPhotoCount = React.useMemo(() => {
    return events.reduce(
      (acc, evt) => acc + evt.steps.reduce((sAcc, step) => sAcc + step.images.length, 0),
      0
    );
  }, [events]);

  // Handle downloading all photos
  const handleExportAllImages = async () => {
    if (!product || totalPhotoCount === 0) {
      toast.info("Tidak ada foto untuk diunduh pada produk ini.");
      return;
    }

    const allImages = events.flatMap((evt) =>
      evt.steps.flatMap((step) =>
        step.images.map((img) => ({
          source: img.signedUrl || img.storage_path,
          fileName: img.file_name || undefined,
          context: {
            event: evt.title || evt.event_type,
            step: STEP_TYPE_TITLES[step.step_type] || step.title,
            productCode: product.product_code || "",
            serialNumber: product.serial_number || "",
          },
        }))
      )
    );

    setIsExportingAll(true);
    const toastId = toast.loading(`Mempersiapkan unduhan ${allImages.length} foto...`);

    try {
      await exportImages({
        images: allImages,
        pipeline: ["convert:jpeg", "zip", "download"],
        jpegQuality: 0.9,
        zip: {
          name: `${product.serial_number}_${product.product_name || "Produk"}_Semua_Foto`,
          folderStrategy: "event-step",
        },
        fileNaming: {
          template: "{event}-{step}_{index}",
          indexPadding: 3,
        },
        onProgress: (p) => {
          if (p.stage === "fetching" || p.stage === "converting") {
            toast.loading(`Memproses foto (${p.currentFileIndex}/${p.totalFiles})...`, { id: toastId });
          } else if (p.stage === "zipping") {
            toast.loading(`Membuat berkas ZIP (${p.percentage}%)...`, { id: toastId });
          }
        },
        onComplete: (res) => {
          if (res.success) {
            toast.success(`Berhasil mengunduh ${res.exportedCount} foto dalam format ZIP`, { id: toastId });
          }
        },
        onError: (err) => {
          toast.error(`Gagal mengekspor foto: ${err.message}`, { id: toastId });
        },
      });
    } catch (err: any) {
      toast.error(`Gagal mengekspor foto: ${err?.message || err}`, { id: toastId });
    } finally {
      setIsExportingAll(false);
    }
  };

  // Handle downloading product & events text information report
  const handleExportProductInfo = () => {
    if (!product) return;

    const lines: string[] = [];
    lines.push("=================================================");
    lines.push("   ELECTRICAL TRACKING SYSTEM (ETS) - INFORMASI PRODUK   ");
    lines.push("=================================================");
    lines.push(`Tanggal Unduh : ${new Date().toLocaleString("id-ID")}`);
    lines.push("");

    lines.push("1. IDENTITAS PRODUK");
    lines.push("-------------------------------------------------");
    lines.push(`Nama Produk     : ${product.product_name || "-"}`);
    lines.push(`Serial Number   : ${product.serial_number || "-"}`);
    lines.push(`Kode Produk     : ${product.product_code || "-"}`);
    lines.push(`Kode Model      : ${product.model_code || "-"}`);
    lines.push(`Model           : ${product.model || "-"}`);
    lines.push(`Tahun Pembuatan : ${product.manufacture_year || "-"}`);
    lines.push(`Status Garansi  : ${product.status === "maintenance" ? "Maintenance" : "Bergaransi"}`);
    lines.push(`Pemilik/Client  : ${product.client?.client_name || "Pemilik Tidak Tercantum"}`);
    lines.push("");

    lines.push("2. SPESIFIKASI TEKNIS");
    lines.push("-------------------------------------------------");
    lines.push(`Kapasitas Daya  : ${product.power_capacity || "-"}`);
    lines.push(`Input Voltage   : ${product.input_voltage || "-"}`);
    lines.push(`Output Voltage  : ${product.output_voltage || "-"}`);
    lines.push(`Frekuensi       : ${product.frequency || "-"}`);
    lines.push(`Jumlah Socket   : ${product.socket_count || "-"}`);
    lines.push(`Ground Output   : ${product.ground_output || "-"}`);
    lines.push(`Soft Fuse       : ${product.soft_fuse || "-"}`);
    lines.push(`Hard Fuse       : ${product.hard_fuse || "-"}`);
    lines.push("");

    lines.push("3. RIWAYAT EVENT & DOKUMENTASI TAHAPAN");
    lines.push("-------------------------------------------------");
    if (events.length === 0) {
      lines.push("Belum ada event / riwayat pelaksanaan recorded.");
    } else {
      events.forEach((evt, evtIdx) => {
        const evtDate = evt.created_at
          ? new Date(evt.created_at).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "-";

        lines.push(`Event #${evtIdx + 1}: ${evt.title || evt.event_type}`);
        lines.push(`  Tanggal Executed : ${evtDate}`);
        lines.push(`  Status Event     : ${evt.status || "-"}`);
        lines.push(`  Tahapan (${evt.steps.length} step):`);

        evt.steps.forEach((step, stepIdx) => {
          const stepTitle = STEP_TYPE_TITLES[step.step_type] || step.title;
          const stepCompletedDate = step.completed_at
            ? new Date(step.completed_at).toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })
            : "Belum selesai";

          lines.push(
            `    - Step ${stepIdx + 1}: ${stepTitle} [Status: ${step.status}] (Tgl Selesai: ${stepCompletedDate}, Total Foto: ${step.images.length})`
          );
          if (step.notes) {
            lines.push(`      Catatan: ${step.notes}`);
          }
        });
        lines.push("");
      });
    }

    lines.push("=================================================");
    lines.push("End of Report - Electrical Tracking System (ETS)");

    const fileContent = lines.join("\n");
    const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ETS_Informasi_Produk_${product.serial_number}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Berhasil mengunduh dokumen informasi produk.");
  };

  const handleScanSuccess = (newSerial: string) => {
    if (newSerial) {
      navigate(`/p/${encodeURIComponent(newSerial)}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
        <PublicHeader />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-zinc-400">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mb-3" />
          <p className="text-sm font-medium">Memuat Informasi Produk ETS...</p>
        </div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
        <PublicHeader />
        <main className="flex-1 max-w-xl mx-auto px-4 py-16 text-center space-y-6">
          <div className="p-4 bg-amber-500/10 text-amber-400 rounded-3xl w-fit mx-auto border border-amber-500/20">
            <AlertTriangle className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-zinc-100">Produk Tidak Ditemukan</h1>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-md mx-auto">
              Nomor seri <span className="font-mono font-bold text-amber-400">{serial_number}</span> tidak terdaftar dalam database resmi Electrical Tracking System.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Button
              onClick={() => setIsScannerOpen(true)}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl py-2.5 px-5"
            >
              Scan QR Code Lain
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/p")}
              className="w-full sm:w-auto border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 text-xs rounded-xl"
            >
              Kembali ke Beranda
            </Button>
          </div>
        </main>

        <QrScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={handleScanSuccess}
        />
      </div>
    );
  }

  // Client info
  const clientName = product.client?.client_name || "Pemilik Tidak Tercantum";
  const clientId = product.client?.client_id || product.current_client_id;
  const clientAvatarUrl = clientId ? getClientAvatarUrl(clientId) : null;
  const initials = getClientInitials(clientName);

  // Header Download Dropdown Element (Icon Only)
  const headerDownloadDropdown = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-xl border-none bg-transparent text-zinc-300 hover:bg-zinc-800/60 hover:text-white shadow-none transition-all focus-visible:ring-1 focus-visible:ring-zinc-600"
          title="Opsi Unduhan"
        >
          {isExportingAll ? (
            <Loader2 className="h-4 w-4 text-zinc-300 animate-spin stroke-[2.5]" />
          ) : (
            <Download className="h-4 w-4 text-zinc-300 stroke-[2.5]" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-zinc-800 text-zinc-100 rounded-xl p-1.5 shadow-2xl z-50">
        <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 px-2.5 py-1">
          Opsi Unduhan Produk
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-800 my-1" />
        <DropdownMenuItem
          onClick={handleExportAllImages}
          disabled={isExportingAll || totalPhotoCount === 0}
          className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium rounded-lg cursor-pointer text-zinc-200 focus:bg-zinc-800 focus:text-white"
        >
          <ImageIcon className="h-4 w-4 text-emerald-400 shrink-0" />
          <div className="flex-1 flex items-center justify-between min-w-0">
            <span className="truncate">Unduh Semua Foto</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 shrink-0">
              {totalPhotoCount}
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleExportProductInfo}
          className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium rounded-lg cursor-pointer text-zinc-200 focus:bg-zinc-800 focus:text-white"
        >
          <FileText className="h-4 w-4 text-cyan-400 shrink-0" />
          <span className="truncate">Unduh Informasi</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      {/* Public Header */}
      <PublicHeader rightAction={headerDownloadDropdown} navItems={navItems} activeId={activeSection} />

      {/* Main Container */}
      <motion.main
        initial={{ opacity: 0, filter: "blur(12px)", y: 16 }}
        animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
        transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6"
      >
        {/* Navigation Bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap -mt-2 sm:-mt-3 mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/p")}
            className="gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-xl py-1 h-8"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Beranda</span>
          </Button>
        </div>

        {/* 1. Header Group: Product Identity (Top) + Client (Bottom) */}
        <motion.div
          id="identitas"
          initial={{ opacity: 0, filter: "blur(8px)", y: 12 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="space-y-1.5 scroll-mt-16"
        >
          {/* 1A. Product Identity Card (Top Section) */}
          <div className="relative rounded-t-3xl rounded-b-none p-[1px] bg-gradient-to-bl from-emerald-400/60 via-zinc-800/40 to-emerald-400/60 shadow-[0_4px_24px_rgba(16,185,129,0.08)] overflow-hidden">
            <div className="w-full h-full bg-gradient-to-br from-emerald-950/40 via-zinc-900/95 to-zinc-950 p-5 sm:p-6 rounded-t-[23px] rounded-b-none space-y-6">
              
              {/* Top Row: Left Text (Identitas Produk) + Right UPS Image */}
              <div className="flex flex-row items-center justify-between gap-4">
                {/* Left Text / Info */}
                <div className="space-y-2.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-emerald-400 text-[11px] sm:text-xs font-bold uppercase tracking-wider">
                    <Hexagon className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[2.5]" />
                    <span>IDENTITAS PRODUK</span>
                  </div>

                  <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-tight truncate">
                    {product.product_name}
                  </h1>

                  {/* Accent Line */}
                  <div className="h-1 w-16 sm:w-20 bg-gradient-to-r from-emerald-400 to-emerald-500/0 rounded-full my-1" />

                  {/* Serial Number Badge */}
                  <div className="pt-0.5">
                    <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/60 font-mono text-xs sm:text-sm font-bold shadow-inner">
                      <span className="text-emerald-400/80">SN:</span>
                      <span className="text-emerald-300 tracking-wide">{product.serial_number}</span>
                    </div>
                  </div>
                </div>

                {/* Right Image Container (Side-by-side with Identitas Produk Header) */}
                <div className="flex flex-col justify-center items-center relative shrink-0 w-32 sm:w-44 md:w-52 py-1">
                  {/* Soft Radial Ambient Glow (Borderless, pure circular aura) */}
                  <div className="absolute inset-0 m-auto w-24 h-24 sm:w-36 sm:h-36 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
                  
                  {/* UPS Asset Image */}
                  <img
                    src="https://cdn.zanxa.studio/ets/UPS-0000.webp"
                    alt={product.product_name}
                    className="relative z-10 h-32 sm:h-44 md:h-52 w-auto object-contain transition-transform hover:scale-105 duration-300 pointer-events-none select-none"
                  />
                </div>
              </div>

              {/* Bottom Row: 2-Column Product Information Grid */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-1">
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3 hover:border-zinc-700/80 transition-colors">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                    <Tag className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block truncate">
                      Kode Produk
                    </span>
                    <span className="text-xs sm:text-sm font-bold font-mono text-zinc-100 truncate block mt-0.5">
                      {product.product_code || "-"}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3 hover:border-zinc-700/80 transition-colors">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                    <FileCode className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block truncate">
                      Kode Model
                    </span>
                    <span className="text-xs sm:text-sm font-bold font-mono text-zinc-100 truncate block mt-0.5">
                      {product.model_code || "-"}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3 hover:border-zinc-700/80 transition-colors">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                    <Cpu className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block truncate">
                      Model
                    </span>
                    <span className="text-xs sm:text-sm font-bold font-mono text-zinc-100 truncate block mt-0.5">
                      {product.model || "-"}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3 hover:border-zinc-700/80 transition-colors">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block truncate">
                      Tahun Produksi
                    </span>
                    <span className="text-xs sm:text-sm font-bold font-mono text-zinc-100 truncate block mt-0.5">
                      {product.manufacture_year || "-"}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* 1B. Client / Owner Card (Bottom Section) */}
          <div className="rounded-b-3xl rounded-t-none border border-zinc-800/90 bg-zinc-900/90 p-4 sm:p-5 shadow-lg">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-white p-1 shadow-md border border-zinc-700 overflow-hidden">
                  {clientAvatarUrl && !clientAvatarError ? (
                    <img
                      src={clientAvatarUrl}
                      alt={clientName}
                      className="h-full w-full object-contain"
                      onError={() => setClientAvatarError(true)}
                    />
                  ) : (
                    <span className="font-bold text-sm text-zinc-900">{initials}</span>
                  )}
                </div>

                <div className="min-w-0">
                  <h2 className="font-bold text-base sm:text-lg text-zinc-100 truncate leading-snug">
                    {clientName}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        isMaintenance
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      }`}
                    >
                      {isMaintenance ? (
                        <>
                          <Wrench className="h-3 w-3" />
                          <span>Status: Maintenance</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-3 w-3" />
                          <span>Status: Bergaransi</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <ChevronRight className="h-5 w-5 text-zinc-500 shrink-0" />
            </div>
          </div>
        </motion.div>

        {/* 2. Spesifikasi Produk Card */}
        <motion.div
          id="spesifikasi"
          initial={{ opacity: 0, filter: "blur(8px)", y: 12 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 sm:p-5 shadow-xl space-y-4 scroll-mt-16"
        >
          <button
            type="button"
            onClick={() => setIsSpecExpanded((prev) => !prev)}
            className="w-full flex items-center justify-between text-left focus:outline-none group cursor-pointer select-none py-2 pl-2"
          >
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200 group-hover:text-emerald-400 transition-colors">
              SPESIFIKASI
            </h2>
            <div>
              {isSpecExpanded ? (
                <ChevronUp className="h-4 w-4 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
              ) : (
                <ChevronDown className="h-4 w-4 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
              )}
            </div>
          </button>

          <AnimatePresence initial={false}>
            {isSpecExpanded && (
              <motion.div
                initial={{ opacity: 0, filter: "blur(6px)", height: 0 }}
                animate={{ opacity: 1, filter: "blur(0px)", height: "auto" }}
                exit={{ opacity: 0, filter: "blur(6px)", height: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-1">
                  <SpecDetailItem icon={Zap} label="Kapasitas Daya" value={product.power_capacity} />
                  <SpecDetailItem icon={Gauge} label="Input Voltage" value={product.input_voltage} />
                  <SpecDetailItem icon={Power} label="Output Voltage" value={product.output_voltage} />
                  <SpecDetailItem icon={Radio} label="Frekuensi" value={product.frequency} />
                  <SpecDetailItem icon={Plug} label="Jumlah Socket" value={product.socket_count} />
                  <SpecDetailItem icon={Cable} label="Ground Output" value={product.ground_output} />
                  <SpecDetailItem icon={Shield} label="Soft Fuse" value={product.soft_fuse} />
                  <SpecDetailItem icon={ShieldCheck} label="Hard Fuse" value={product.hard_fuse} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* 3. Laporan Section */}
        <PublicReportCard
          isExpanded={isReportExpanded}
          onToggleExpand={() => setIsReportExpanded((prev) => !prev)}
        />

        {/* 4. Dokumentasi & Event Section */}
        <div id="dokumentasi" className="space-y-3 pt-2 scroll-mt-16">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
            DOKUMENTASI
          </h2>

          <PublicEventAccordion
            productId={product.product_id}
            serialNumber={product.serial_number}
          />
        </div>

        {/* 5. QR Code Section */}
        <PublicQrCodeCard
          serialNumber={product.serial_number}
          productName={product.product_name}
          isExpanded={isQrExpanded}
          onToggleExpand={() => setIsQrExpanded((prev) => !prev)}
        />
      </motion.main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-6 bg-zinc-950 text-center text-xs text-zinc-500 mt-12">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-center">
          <p>&copy; {new Date().getFullYear()} Electrical Tracking System (ETS). All rights reserved.</p>
        </div>
      </footer>

      {/* Scanner Modal */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
}
