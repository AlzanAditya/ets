import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Building2,
  Tag,
  BatteryCharging,
  Zap,
  Activity,
  ArrowLeft,
  Wrench,
  Download,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "./components/PublicHeader";
import { QrScannerModal } from "./components/QrScannerModal";
import { PublicQrCodeCard } from "./components/PublicQrCodeCard";
import { PublicEventAccordion } from "./components/PublicEventAccordion";
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

function SpecDetailItem({ label, value, isFullWidth }: { label: string; value?: string | number | null; isFullWidth?: boolean }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className={`p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 ${isFullWidth ? "sm:col-span-2" : ""}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block mb-0.5">
        {label}
      </span>
      <span className="text-xs sm:text-sm font-semibold text-zinc-100 font-mono">
        {String(value)}
      </span>
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      {/* Public Header */}
      <PublicHeader />

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/p")}
            className="gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-xl"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Beranda</span>
          </Button>

          {totalPhotoCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportAllImages}
              disabled={isExportingAll}
              className="gap-1.5 text-xs border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white rounded-xl"
            >
              <Download className="h-3.5 w-3.5 text-emerald-400" />
              <span>Unduh Foto ({totalPhotoCount})</span>
            </Button>
          )}
        </div>

        {/* 1. Header Produk Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 shadow-xl space-y-6">
          {/* Top Row: Client & Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
            {/* Client Profile */}
            <div className="flex items-center gap-3">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-800 border border-zinc-700 text-emerald-400 font-bold text-sm overflow-hidden">
                {clientAvatarUrl ? (
                  <img
                    src={clientAvatarUrl}
                    alt={clientName}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                ) : null}
                <span>{initials}</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Building2 className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Pemilik / Perusahaan Client</span>
                </div>
                <h2 className="font-bold text-base text-zinc-100">{clientName}</h2>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  isMaintenance
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                }`}
              >
                {isMaintenance ? (
                  <>
                    <Wrench className="h-3.5 w-3.5" />
                    Status: Maintenance
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Status: Bergaransi
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Product Identification */}
          <div className="space-y-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Identitas Produk
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-0.5">
                {product.product_name}
              </h1>
            </div>

            {/* Serial Number & Key Tags */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 font-mono text-xs">
                <span className="text-zinc-400 font-semibold">SN:</span>
                <span className="text-emerald-400 font-bold">{product.serial_number}</span>
              </div>

              {product.client?.client_name && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border border-zinc-700 bg-zinc-800 font-bold text-xs text-zinc-100">
                  <Building2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{product.client.client_name}</span>
                </div>
              )}

              {product.model && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-zinc-800 bg-zinc-950 font-medium text-xs text-zinc-300">
                  <Tag className="h-3.5 w-3.5 text-amber-400" />
                  <span>Model: {product.model}</span>
                </div>
              )}

              {product.power_capacity && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-zinc-800 bg-zinc-950 font-medium text-xs text-zinc-300">
                  <BatteryCharging className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Daya: {product.power_capacity}</span>
                </div>
              )}

              {product.input_voltage && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-zinc-800 bg-zinc-950 font-medium text-xs text-zinc-300">
                  <Zap className="h-3.5 w-3.5 text-yellow-400" />
                  <span>Input: {product.input_voltage}</span>
                </div>
              )}

              {product.frequency && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-zinc-800 bg-zinc-950 font-medium text-xs text-zinc-300">
                  <Activity className="h-3.5 w-3.5 text-rose-400" />
                  <span>Frekuensi: {product.frequency}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Spesifikasi Produk Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-400" />
              <span>Spesifikasi Teknis Lengkap</span>
            </h2>
            <span className="text-[11px] font-mono text-zinc-400">Informasi Terbuka</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <SpecDetailItem label="Nomor Seri (SN)" value={product.serial_number} />
            <SpecDetailItem label="Kode Produk" value={product.product_code} />
            <SpecDetailItem label="Nama Produk" value={product.product_name} isFullWidth />
            <SpecDetailItem label="Kode Model" value={product.model_code} />
            <SpecDetailItem label="Model" value={product.model} />
            <SpecDetailItem label="Tahun Pembuatan" value={product.manufacture_year} />
            <SpecDetailItem label="Kapasitas Daya" value={product.power_capacity} />
            <SpecDetailItem label="Input Voltage" value={product.input_voltage} />
            <SpecDetailItem label="Output Voltage" value={product.output_voltage} />
            <SpecDetailItem label="Frekuensi" value={product.frequency} />
            <SpecDetailItem label="Jumlah Socket" value={product.socket_count} />
            <SpecDetailItem label="Soft Fuse" value={product.soft_fuse} />
            <SpecDetailItem label="Hard Fuse" value={product.hard_fuse} />
            <SpecDetailItem label="Ground Output" value={product.ground_output} isFullWidth />
          </div>
        </div>

        {/* 3. QR Code Section */}
        <PublicQrCodeCard
          serialNumber={product.serial_number}
          productName={product.product_name}
        />

        {/* 4. Dokumentasi & Event Section */}
        <div className="space-y-3 pt-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            <span>Dokumentasi Instalasi &amp; Maintenance</span>
          </h2>

          <PublicEventAccordion
            productId={product.product_id}
            serialNumber={product.serial_number}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-6 bg-zinc-950 text-center text-xs text-zinc-500 mt-12">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>&copy; {new Date().getFullYear()} Electrical Tracking System (ETS). All rights reserved.</p>
          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Verifikasi Publik Resmi</span>
          </div>
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
