import * as React from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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
  ExternalLink,
  Package,
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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { PublicHeader } from "./components/PublicHeader";
import { PublicQrCodeCard } from "./components/PublicQrCodeCard";
import { EntityProfileBanner } from "@/components/entity-profile-banner";
import { cn } from "@/lib/utils";
import { publicCache } from "@/lib/public-cache";
import {
  SectionBlurLoader,
  FullProductDetailSkeleton,
} from "./components/PublicProductSkeletons";

const QrScannerModal = React.lazy(() => import("./components/QrScannerModal"));
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

function ClientProductStatusBadge({ status }: { status?: string }) {
  const s = status?.toLowerCase() || "";
  if (s === "maintenance") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
        <Wrench className="h-3 w-3" />
        <span>Maintenance</span>
      </span>
    );
  }
  if (s === "instalasi" || s === "installation") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
        <Zap className="h-3 w-3" />
        <span>Instalasi</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
      <ShieldCheck className="h-3 w-3" />
      <span>Bergaransi</span>
    </span>
  );
}

export default function PublicProductDetail() {
  const { serial_number } = useParams<{ serial_number: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [product, setProduct] = React.useState<ProductWithRelations | null>(null);
  const [events, setEvents] = React.useState<ProductEventData[]>([]);
  const [clientProducts, setClientProducts] = React.useState<ProductWithRelations[]>([]);
  const [clientProductsLoading, setClientProductsLoading] = React.useState(false);
  const [isClientExpanded, setIsClientExpanded] = React.useState(false);

  const [loading, setLoading] = React.useState(true);
  const [isProductFetching, setIsProductFetching] = React.useState(false);
  const [activeSwitchingSerial, setActiveSwitchingSerial] = React.useState<string | null>(null);
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
  const preserveScrollRef = React.useRef(false);

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

  // Reset scroll position to top whenever serial_number changes, EXCEPT when navigating from client table
  React.useLayoutEffect(() => {
    const isPreserve = (location.state as any)?.preserveScroll || preserveScrollRef.current;
    if (isPreserve) {
      preserveScrollRef.current = false;
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [serial_number, location.state]);

  // 1. Topmost Component: Load product identity by serial_number
  React.useEffect(() => {
    let isMounted = true;
    async function loadProductData() {
      if (!serial_number) {
        if (isMounted) setNotFound(true);
        return;
      }

      const cacheKeyProduct = `public_product_${serial_number}`;
      const cachedProd = publicCache.get<ProductWithRelations>(cacheKeyProduct);

      if (cachedProd) {
        if (isMounted) {
          setProduct(cachedProd);
          setNotFound(false);
          setLoading(false);
          setIsProductFetching(false);
          setActiveSwitchingSerial(null);
        }
      } else {
        if (isMounted) {
          if (!product) {
            setLoading(true);
          } else {
            setIsProductFetching(true);
          }
        }
      }

      try {
        const prod = await productsService.getProductBySerial(serial_number);
        if (!prod) {
          if (isMounted && !cachedProd && !product) setNotFound(true);
          return;
        }

        publicCache.set(cacheKeyProduct, prod);
        if (isMounted) {
          setProduct(prod);
          setNotFound(false);
        }
      } catch (err) {
        console.error("Failed to load public product detail:", err);
        if (isMounted && !cachedProd && !product) setNotFound(true);
      } finally {
        if (isMounted) {
          setLoading(false);
          setIsProductFetching(false);
          setActiveSwitchingSerial(null);
        }
      }
    }

    loadProductData();
    return () => {
      isMounted = false;
    };
  }, [serial_number]);

  // 2. Client Component: Load client's other products progressively once client ID is known
  React.useEffect(() => {
    let isMounted = true;
    const clientId = product?.client?.client_id || product?.current_client_id || undefined;
    if (!clientId) {
      setClientProducts([]);
      return;
    }

    async function loadClientProducts() {
      const cacheKey = `public_client_prods_${clientId}`;
      const cachedList = publicCache.get<ProductWithRelations[]>(cacheKey);

      if (cachedList) {
        if (isMounted) {
          setClientProducts(cachedList);
          setClientProductsLoading(false);
        }
      } else {
        if (isMounted) setClientProductsLoading(true);
      }

      try {
        const list = await productsService.getProducts({ client_id: clientId, limit: 100 });
        const valid = list || [];
        publicCache.set(cacheKey, valid);
        if (isMounted) setClientProducts(valid);
      } catch (err) {
        console.error("Failed to load client products:", err);
      } finally {
        if (isMounted) setClientProductsLoading(false);
      }
    }

    loadClientProducts();
    return () => {
      isMounted = false;
    };
  }, [product?.client?.client_id, product?.current_client_id]);

  // 3. Events Component: Load product events progressively once product ID is known
  React.useEffect(() => {
    let isMounted = true;
    const pid = product?.product_id;
    if (!pid) {
      setEvents([]);
      return;
    }

    async function loadEventsData(productIdStr: string) {
      const cacheKeyEvents = `public_events_${productIdStr}`;
      const cachedEvts = publicCache.get<ProductEventData[]>(cacheKeyEvents);

      if (cachedEvts) {
        if (isMounted) setEvents(cachedEvts);
      }

      try {
        const evts = await productEventsService.getProductEvents(productIdStr);
        const validEvts = evts || [];
        publicCache.set(cacheKeyEvents, validEvts);
        if (isMounted) setEvents(validEvts);
      } catch (err) {
        console.error("Failed to load product events:", err);
      }
    }

    loadEventsData(pid);
    return () => {
      isMounted = false;
    };
  }, [product?.product_id]);

  // Calculate count of other products owned by client (excluding current product)
  const otherProductsCount = React.useMemo(() => {
    if (!product) return 0;
    return clientProducts.filter((p) => p.product_id !== product.product_id).length;
  }, [clientProducts, product]);

  // Determine status & dynamic theme configuration
  const statusConfig = React.useMemo(() => {
    const s = product?.status?.toLowerCase() || "";
    if (s === "maintenance") {
      return {
        statusKey: "maintenance",
        bannerVariant: "orange" as const,
        label: "Maintenance",
        Icon: Wrench,
        headerTextColor: "text-amber-400 dark:text-amber-400",
        accentGradient: "from-amber-400 via-amber-500/50 to-amber-500/0",
        snChipBg: "bg-amber-500/20 text-amber-300 border-r border-amber-500/30",
        snTextColor: "text-amber-400",
        snBorder: "border-amber-500/40",
        glowBg: "bg-amber-500/25",
        detailIconBg: "bg-amber-500/10 text-amber-400",
        badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/50",
      };
    }
    if (s === "instalasi" || s === "installation") {
      return {
        statusKey: "instalasi",
        bannerVariant: "blue" as const,
        label: "Instalasi",
        Icon: Zap,
        headerTextColor: "text-blue-400 dark:text-blue-400",
        accentGradient: "from-blue-400 via-blue-500/50 to-blue-500/0",
        snChipBg: "bg-blue-500/20 text-blue-300 border-r border-blue-500/30",
        snTextColor: "text-blue-400",
        snBorder: "border-blue-500/40",
        glowBg: "bg-blue-500/25",
        detailIconBg: "bg-blue-500/10 text-blue-400",
        badgeBg: "bg-blue-500/20 text-blue-300 border-blue-500/50",
      };
    }
    // Default: Garansi / Bergaransi
    return {
      statusKey: "garansi",
      bannerVariant: "emerald" as const,
      label: "Bergaransi",
      Icon: ShieldCheck,
      headerTextColor: "text-emerald-400 dark:text-emerald-400",
      accentGradient: "from-emerald-400 via-emerald-500/50 to-emerald-500/0",
      snChipBg: "bg-emerald-500/20 text-emerald-300 border-r border-emerald-500/30",
      snTextColor: "text-emerald-400",
      snBorder: "border-emerald-500/40",
      glowBg: "bg-emerald-500/25",
      detailIconBg: "bg-emerald-500/10 text-emerald-400",
      badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/50",
    };
  }, [product?.status]);
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

  if (loading && !product) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
        <PublicHeader navItems={navItems} activeId={activeSection} />
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
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
          <FullProductDetailSkeleton />
        </main>
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

        {/* 1. Header Group: Product Identity (Layer Depan) + Client Owner (Layer Belakang) */}
        <motion.div
          id="identitas"
          initial={{ opacity: 0, filter: "blur(8px)", y: 12 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="scroll-mt-16"
        >
          <EntityProfileBanner
            variant={statusConfig.bannerVariant}
            customFrontLayer={
              <SectionBlurLoader loading={isProductFetching} label="Memuat Identitas Produk...">
                <div className="p-5 sm:p-6 space-y-5">
                  {/* Top Row: Left Text (Identitas Produk) + Right UPS Image with Attached Badge */}
                  <div className="flex flex-row items-center justify-between gap-4">
                    {/* Left Text / Info */}
                    <div className="space-y-2.5 flex-1 min-w-0">
                      <div className={cn("flex items-center gap-2 text-[9px] sm:text-[10px] font-bold tracking-wider", statusConfig.headerTextColor)}>
                        <span>Nama Produk</span>
                      </div>

                      <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground tracking-tight leading-tight truncate">
                        {product.product_name}
                      </h1>

                      {/* Dynamic Accent Line */}
                      <div className={cn("h-1 w-16 sm:w-20 bg-gradient-to-r rounded-full my-1", statusConfig.accentGradient)} />

                      {/* Dual-color Serial Number Badge */}
                      <div className="pt-2.5 sm:pt-4">
                        <div className={cn("inline-flex items-stretch rounded-xl border font-mono text-xs sm:text-sm shadow-inner overflow-hidden bg-zinc-950/90", statusConfig.snBorder)}>
                          <span className={cn("px-2.5 py-1 sm:py-1.5 flex items-center font-bold text-xs uppercase tracking-wider shrink-0 rounded-r-none", statusConfig.snChipBg)}>
                            SN:
                          </span>
                          <span className={cn("px-2.5 sm:px-3 py-1 sm:py-1.5 flex items-center font-medium tracking-wide font-mono", statusConfig.snTextColor)}>
                            {product.serial_number}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Image Container with Absolute Status Badge */}
                    <div className="flex flex-col justify-center items-center relative shrink-0 w-32 sm:w-44 md:w-52 py-2">
                      {/* Dynamic Ambient Radial Glow */}
                      <div className={cn("absolute inset-0 m-auto w-24 h-24 sm:w-36 sm:h-36 rounded-full blur-2xl pointer-events-none transition-colors duration-300", statusConfig.glowBg)} />

                      {/* UPS Asset Image */}
                      <img
                        src="https://cdn.zanxa.studio/ets/UPS-0000.webp"
                        alt={product.product_name}
                        className="relative z-10 h-32 sm:h-44 md:h-52 w-auto object-contain transition-transform hover:scale-105 duration-300 pointer-events-none select-none pb-2 sm:pb-3"
                      />

                      {/* Absolute Status Badge Attached to Image */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20 shrink-0 whitespace-nowrap">
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold border shadow-lg backdrop-blur-md transition-all", statusConfig.badgeBg)}>
                          <statusConfig.Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                          <span>{statusConfig.label}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: 2-Column Product Information Grid with Dynamic Icon Colors */}
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-1">
                    <div className="rounded-xl border border-border/80 bg-background/50 dark:bg-zinc-950/60 p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3 hover:border-border transition-colors">
                      <div className={cn("p-2 rounded-lg shrink-0", statusConfig.detailIconBg)}>
                        <Tag className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block truncate">
                          Kode Produk
                        </span>
                        <span className="text-xs sm:text-sm font-bold font-mono text-foreground truncate block mt-0.5">
                          {product.product_code || "-"}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/80 bg-background/50 dark:bg-zinc-950/60 p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3 hover:border-border transition-colors">
                      <div className={cn("p-2 rounded-lg shrink-0", statusConfig.detailIconBg)}>
                        <FileCode className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block truncate">
                          Kode Model
                        </span>
                        <span className="text-xs sm:text-sm font-bold font-mono text-foreground truncate block mt-0.5">
                          {product.model_code || "-"}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/80 bg-background/50 dark:bg-zinc-950/60 p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3 hover:border-border transition-colors">
                      <div className={cn("p-2 rounded-lg shrink-0", statusConfig.detailIconBg)}>
                        <Cpu className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block truncate">
                          Model
                        </span>
                        <span className="text-xs sm:text-sm font-bold font-mono text-foreground truncate block mt-0.5">
                          {product.model || "-"}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/80 bg-background/50 dark:bg-zinc-950/60 p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3 hover:border-border transition-colors">
                      <div className={cn("p-2 rounded-lg shrink-0", statusConfig.detailIconBg)}>
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block truncate">
                          Tahun Produksi
                        </span>
                        <span className="text-xs sm:text-sm font-bold font-mono text-foreground truncate block mt-0.5">
                          {product.manufacture_year || "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </SectionBlurLoader>
            }
            backLayerContent={
              <div className="space-y-3">
                {/* Header row with click to toggle expand */}
                <div
                  onClick={() => setIsClientExpanded((prev) => !prev)}
                  className="flex items-center justify-between gap-3 cursor-pointer select-none group p-1 -m-1 rounded-xl hover:bg-zinc-900/60 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
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

                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                        Klien Pemilik
                      </span>
                      <h2 className="font-bold text-base sm:text-lg text-foreground truncate leading-snug mt-0.5 group-hover:text-emerald-400 transition-colors">
                        {clientName}
                      </h2>
                    </div>
                  </div>

                  {/* Badge & Chevron Controls Box (Placed right before Chevron) */}
                  <div className="flex items-center gap-2 shrink-0">
                    {clientProductsLoading ? (
                      <div className="px-2.5 py-1.5 rounded-xl border border-zinc-800 text-zinc-400 text-xs font-normal flex items-center gap-1.5">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
                        <span className="hidden sm:inline">Memuat...</span>
                      </div>
                    ) : (
                      <div className="px-2.5 py-1.5 rounded-xl border border-zinc-800 text-zinc-400 group-hover:text-zinc-100 group-hover:border-zinc-700 transition-all text-xs font-normal flex items-center gap-1">
                        <span className="hidden sm:inline">
                          {otherProductsCount > 0 ? `${otherProductsCount} Produk Lainnya` : "0 Produk Lainnya"}
                        </span>
                        <span className="inline-flex sm:hidden items-center gap-1">
                          <span>{otherProductsCount}</span>
                          <Package className="h-3.5 w-3.5 text-zinc-400 stroke-[1.5]" />
                        </span>
                      </div>
                    )}

                    <div className="p-2 rounded-xl border border-zinc-800 text-zinc-400 group-hover:text-zinc-100 group-hover:border-zinc-700 transition-all shrink-0">
                      {isClientExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expandable Table for Client Products */}
                <AnimatePresence initial={false}>
                  {isClientExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden pt-2"
                    >
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 overflow-hidden shadow-lg">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-zinc-800 bg-zinc-900/90 hover:bg-zinc-900/90">
                              <TableHead className="w-12 text-center text-xs font-bold text-zinc-400">No.</TableHead>
                              <TableHead className="text-xs font-bold text-zinc-400">Serial Nomor</TableHead>
                              <TableHead className="text-xs font-bold text-zinc-400">Nama Produk</TableHead>
                              <TableHead className="text-xs font-bold text-zinc-400">Status</TableHead>
                              <TableHead className="w-12 text-center text-xs font-bold text-zinc-400"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {clientProducts.map((p, idx) => {
                              const isCurrentProduct = p.product_id === product?.product_id;
                              const isRowLoading = isProductFetching && activeSwitchingSerial === p.serial_number;
                              return (
                                <TableRow
                                  key={p.product_id}
                                  onClick={() => {
                                    if (!isCurrentProduct) {
                                      preserveScrollRef.current = true;
                                      setActiveSwitchingSerial(p.serial_number);
                                      navigate(`/p/${p.serial_number}`, { state: { preserveScroll: true } });
                                    } else {
                                      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
                                    }
                                  }}
                                  className={cn(
                                    "hover:bg-zinc-900/80 cursor-pointer transition-colors border-zinc-800/60",
                                    isCurrentProduct && "bg-zinc-800/90 hover:bg-zinc-800",
                                    isRowLoading && "bg-emerald-950/30 border-emerald-500/30"
                                  )}
                                >
                                  <TableCell className="text-center text-zinc-400 font-mono text-xs">
                                    {idx + 1}
                                  </TableCell>
                                  <TableCell className="font-mono text-zinc-200 text-xs font-semibold">
                                    {p.serial_number}
                                  </TableCell>
                                  <TableCell className="text-zinc-200 text-xs">
                                    {p.product_name}
                                  </TableCell>
                                  <TableCell>
                                    <ClientProductStatusBadge status={p.status} />
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {isRowLoading ? (
                                      <Loader2 className="h-4 w-4 inline-block animate-spin text-emerald-400" />
                                    ) : (
                                      <ExternalLink
                                        className={cn(
                                          "h-4 w-4 inline-block",
                                          isCurrentProduct ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-200"
                                        )}
                                      />
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            }
          />
        </motion.div>

        {/* 2. Spesifikasi Produk Card */}
        <motion.div
          id="spesifikasi"
          initial={{ opacity: 0, filter: "blur(8px)", y: 12 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 sm:p-5 shadow-xl space-y-4 scroll-mt-16 overflow-hidden"
        >
          <SectionBlurLoader loading={isProductFetching} label="Memuat Spesifikasi...">
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
          </SectionBlurLoader>
        </motion.div>

        {/* 3. Laporan Section */}
        <SectionBlurLoader loading={isProductFetching} label="Memuat Laporan...">
          <PublicReportCard
            isExpanded={isReportExpanded}
            onToggleExpand={() => setIsReportExpanded((prev) => !prev)}
          />
        </SectionBlurLoader>

        {/* 4. Dokumentasi & Event Section */}
        <div id="dokumentasi" className="space-y-3 pt-2 scroll-mt-16">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
            DOKUMENTASI
          </h2>

          <PublicEventAccordion
            productId={product.product_id}
            serialNumber={product.serial_number}
            isProductLoading={isProductFetching}
          />
        </div>

        {/* 5. QR Code Section */}
        <SectionBlurLoader loading={isProductFetching} label="Memuat Kode QR...">
          <PublicQrCodeCard
            serialNumber={product.serial_number}
            productName={product.product_name}
            isExpanded={isQrExpanded}
            onToggleExpand={() => setIsQrExpanded((prev) => !prev)}
          />
        </SectionBlurLoader>
      </motion.main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-6 bg-zinc-950 text-center text-xs text-zinc-500 mt-12">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-center">
          <p>&copy; {new Date().getFullYear()} Electrical Tracking System (ETS). All rights reserved.</p>
        </div>
      </footer>

      {/* Scanner Modal */}
      <React.Suspense fallback={null}>
        <QrScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={handleScanSuccess}
        />
      </React.Suspense>
    </div>
  );
}
