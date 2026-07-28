import * as React from "react";
import {
  ZapIcon,
  PencilIcon,
  ArrowLeftIcon,
  QrCodeIcon,
  Building2Icon,
  ShieldCheckIcon,
  Wrench,
  ChevronDownIcon,
  ActivityIcon,
  DownloadIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductEventAccordion } from "./product-event-accordion";
import { ProductActivityTimeline } from "./product-activity-timeline";
import { productsService, type ProductWithRelations } from "@/services/products.service";
import { productEventsService, type ProductEventData, STEP_TYPE_TITLES } from "@/services/product-events.service";
import { exportImages } from "@/lib/image-export";
import { cn } from "@/lib/utils";

interface FieldRowProps {
  label: string;
  value?: string | number | null;
  className?: string;
  isFullWidth?: boolean;
}

function FieldRow({ label, value, className, isFullWidth }: FieldRowProps) {
  const displayVal = value !== null && value !== undefined && String(value).trim() !== "" ? String(value) : "—";
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 text-xs sm:text-sm", isFullWidth && "col-span-full", className)}>
      <span className="text-zinc-400 shrink-0 sm:w-36">{label}</span>
      <span className="text-zinc-100 font-medium break-words">{displayVal}</span>
    </div>
  );
}

interface ProductViewModeProps {
  product: ProductWithRelations;
  onEdit: () => void;
  onBack: () => void;
  signedImages?: Array<{ storagePath: string; thumbUrl?: string; fullUrl?: string }>;
}

export function ProductViewMode({
  product,
  onEdit,
  onBack,
}: ProductViewModeProps) {
  const [currentProduct, setCurrentProduct] = React.useState<ProductWithRelations>(product);
  const [events, setEvents] = React.useState<ProductEventData[]>([]);
  const [showFullSpecs, setShowFullSpecs] = React.useState(false);

  // Sync prop changes
  React.useEffect(() => {
    setCurrentProduct(product);
  }, [product]);

  // Load events to determine if installation is active
  const refreshData = React.useCallback(async () => {
    try {
      const [latestEvents, updatedProd] = await Promise.all([
        productEventsService.getProductEvents(product.product_id),
        productsService.getProductBySerial(product.serial_number),
      ]);
      if (latestEvents) setEvents(latestEvents);
      if (updatedProd) setCurrentProduct(updatedProd);
    } catch (err) {
      console.warn("Failed to refresh product data:", err);
    }
  }, [product.product_id, product.serial_number]);

  React.useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Determine status flags according to Requirement 9
  const isInstallationActive = events.some(
    (e) => e.event_type === "installation" && e.status === "active"
  );
  const isMaintenance = currentProduct.status === "maintenance";

  // Accent styles according to Requirement 9
  let avatarRingClass = "border-emerald-500/30 bg-emerald-950/40 text-emerald-400";
  let statusBadgeClass = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  let statusLabel = "Bergaransi";
  let editBtnClass = "bg-emerald-500 text-zinc-950 font-bold hover:bg-emerald-400";
  let modelTagClass = "bg-emerald-950/30 border-emerald-500/20 text-emerald-300";

  if (isMaintenance) {
    avatarRingClass = "border-amber-500/30 bg-amber-950/40 text-amber-400";
    statusBadgeClass = "bg-amber-500/20 text-amber-400 border-amber-500/30";
    statusLabel = "Maintenance";
    editBtnClass = "bg-amber-500 text-zinc-950 font-bold hover:bg-amber-400";
    modelTagClass = "bg-amber-950/30 border-amber-500/20 text-amber-300";
  } else if (isInstallationActive) {
    avatarRingClass = "border-emerald-500/30 bg-emerald-950/40 text-emerald-400";
    statusBadgeClass = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    statusLabel = "Bergaransi";
    editBtnClass = "bg-emerald-500 text-zinc-950 font-bold hover:bg-emerald-400";
    modelTagClass = "bg-emerald-950/30 border-emerald-500/20 text-emerald-300";
  }

  // Total photos count across all events and steps
  const totalPhotoCount = React.useMemo(() => {
    return events.reduce(
      (acc, evt) => acc + evt.steps.reduce((sAcc, step) => sAcc + step.images.length, 0),
      0
    );
  }, [events]);

  const [isExportingAll, setIsExportingAll] = React.useState(false);

  const handleExportAllImages = async () => {
    if (totalPhotoCount === 0) {
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
            productCode: currentProduct.product_code || "",
            serialNumber: currentProduct.serial_number || "",
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
          name: `${currentProduct.serial_number}_${currentProduct.product_name || "Produk"}_Semua_Foto`,
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
          } else if (p.stage === "downloading") {
            toast.loading("Memulai pengunduhan ZIP...", { id: toastId });
          }
        },
        onComplete: (res) => {
          if (res.success) {
            toast.success(`Berhasil mengunduh ${res.exportedCount} foto dalam format ZIP`, { id: toastId });
          } else {
            toast.error(`Ekspor selesai dengan ${res.failedCount} berkas gagal`, { id: toastId });
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 w-full space-y-6 pb-16">
      {/* ── Header Navigation Bar ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground rounded-xl"
        >
          <ArrowLeftIcon className="size-4" />
          <span>Kembali ke Daftar Produk</span>
        </Button>

        <div className="flex items-center gap-2">
          {/* Level 1: Download All Photos Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportAllImages}
            disabled={isExportingAll || totalPhotoCount === 0}
            className="gap-1.5 text-xs rounded-xl bg-zinc-900/90 border-zinc-800 hover:bg-zinc-800 text-zinc-200 transition-colors"
            title={
              totalPhotoCount === 0
                ? "Tidak ada foto untuk diunduh"
                : "Unduh semua foto produk dalam format ZIP"
            }
          >
            <DownloadIcon className="size-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Unduh Semua Foto</span>
            <span className="sm:hidden">Unduh Foto</span>
            {totalPhotoCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">
                {totalPhotoCount}
              </span>
            )}
          </Button>

          <a
            href={`https://qr.zanxa.studio/p/${currentProduct.serial_number}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-xl">
              <QrCodeIcon className="size-3.5 text-emerald-500" />
              <span>QR Code</span>
            </Button>
          </a>
        </div>
      </div>

      {/* ── Main Product Card ── */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100 p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            {/* REQUIREMENT 9: Product Avatar Ring & Icon adapting to status */}
            <div
              className={cn(
                "flex size-12 sm:size-14 shrink-0 items-center justify-center rounded-2xl border shadow-inner transition-colors",
                avatarRingClass
              )}
            >
              {isMaintenance ? (
                <Wrench className="size-6 sm:size-7 animate-pulse text-amber-400" />
              ) : isInstallationActive ? (
                <Wrench className="size-6 sm:size-7 animate-pulse text-emerald-400" />
              ) : (
                <ShieldCheckIcon className="size-6 sm:size-7 text-emerald-400" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {currentProduct.product_name}
                </h1>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <span>Serial No.</span>
                <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 font-bold text-zinc-200">
                  {currentProduct.serial_number}
                </span>
              </div>
            </div>
          </div>

          <Button
            onClick={onEdit}
            size="sm"
            className={cn("text-xs gap-1.5 rounded-xl self-start shrink-0 px-3.5 shadow-sm transition-colors", editBtnClass)}
          >
            <PencilIcon className="size-3.5" />
            <span>Edit</span>
          </Button>
        </div>

        {/* Client & Status Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* Client badge */}
          {currentProduct.client && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-200 text-xs font-semibold">
              <Building2Icon className="size-3.5 text-zinc-400" />
              <span>{currentProduct.client.client_name}</span>
            </div>
          )}

          {/* REQUIREMENT 9: Status badge adaptivity */}
          <Badge
            variant="outline"
            className={cn("text-xs font-bold px-3 py-1 gap-1.5 rounded-xl border transition-colors", statusBadgeClass)}
          >
            {isMaintenance ? (
              <Wrench className="size-3.5" />
            ) : isInstallationActive ? (
              <Wrench className="size-3.5" />
            ) : (
              <ShieldCheckIcon className="size-3.5" />
            )}
            <span>{statusLabel}</span>
          </Badge>
        </div>

        {/* Quick Spec Tags */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {currentProduct.model && (
            <span className={cn("px-2.5 py-1 rounded-lg border text-xs font-bold transition-colors", modelTagClass)}>
              {currentProduct.model}
            </span>
          )}
          {currentProduct.frequency && (
            <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono font-medium flex items-center gap-1">
              <ZapIcon className="size-3 text-emerald-400" />
              {currentProduct.frequency}
            </span>
          )}
          {currentProduct.input_voltage && (
            <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono font-medium flex items-center gap-1">
              <ZapIcon className="size-3 text-amber-400" />
              {currentProduct.input_voltage}
            </span>
          )}
          {currentProduct.power_capacity && (
            <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono font-medium flex items-center gap-1">
              <ZapIcon className="size-3 text-blue-400" />
              {currentProduct.power_capacity}
            </span>
          )}
        </div>

        {/* Expandable Technical Specs Drawer */}
        <div className="pt-2 border-t border-zinc-800/80">
          <button
            onClick={() => setShowFullSpecs(!showFullSpecs)}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 py-1 transition-colors font-medium cursor-pointer"
          >
            <span>{showFullSpecs ? "Sembunyikan Spesifikasi" : "Tampilkan Spesifikasi"}</span>
            <ChevronDownIcon className={cn("size-3.5 transition-transform duration-200", showFullSpecs && "rotate-180")} />
          </button>

          {showFullSpecs && (
            <div className="pt-3 pb-1 grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-6 border-t border-zinc-900 mt-2">
              <FieldRow label="Nomor Seri" value={currentProduct.serial_number} />
              <FieldRow label="Kode Produk" value={currentProduct.product_code} />
              <FieldRow label="Nama Produk" value={currentProduct.product_name} isFullWidth />
              <FieldRow label="Model Kode" value={currentProduct.model_code} />
              <FieldRow label="Tahun Pembuatan" value={currentProduct.manufacture_year} />
              <FieldRow label="Input Voltage" value={currentProduct.input_voltage} />
              <FieldRow label="Output Voltage" value={currentProduct.output_voltage} />
              <FieldRow label="Frekuensi" value={currentProduct.frequency} />
              <FieldRow label="Jumlah Socket" value={currentProduct.socket_count} />
              <FieldRow label="Soft Fuse" value={currentProduct.soft_fuse} />
              <FieldRow label="Hard Fuse" value={currentProduct.hard_fuse} />
              <FieldRow label="Ground Output" value={currentProduct.ground_output} isFullWidth />
            </div>
          )}
        </div>
      </div>

      {/* ── Event & Sub Event Accordions ── */}
      <div className="space-y-3 pt-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <ActivityIcon className="size-4 text-primary" />
          <span>Riwayat Event &amp; Dokumentasi</span>
        </h2>

        <ProductEventAccordion
          productId={currentProduct.product_id}
          onEventsUpdated={refreshData}
        />
      </div>

      {/* ── Product Activity Timeline Section ── */}
      <div className="pt-6 border-t space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Log Aktivitas
        </h2>
        <ProductActivityTimeline productId={currentProduct.product_id} product={currentProduct} />
      </div>
    </div>
  );
}
