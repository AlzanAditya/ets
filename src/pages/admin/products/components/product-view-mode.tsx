import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  ZapIcon,
  PencilIcon,
  ArrowLeftIcon,
  QrCodeIcon,
  Building2Icon,
  ShieldCheckIcon,
  Wrench,
  ActivityIcon,
  DownloadIcon,
  TagIcon,
  BatteryChargingIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  EntityProfileBanner,
  CompactDetailRow,
  type EntityBadge,
  type HeaderAction,
} from "@/components/entity-profile-banner";
import { ProductEventAccordion } from "./product-event-accordion";
import { ProductActivityTimeline } from "./product-activity-timeline";
import { ProductWarrantyCard } from "@/components/warranties/product-warranty-card";
import { productsService, type ProductWithRelations } from "@/services/products.service";
import { productEventsService, type ProductEventData, STEP_TYPE_TITLES } from "@/services/product-events.service";
import { exportImages } from "@/lib/image-export";
import { getClientAvatarUrl } from "@/lib/image-service";

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
  const navigate = useNavigate();
  const [currentProduct, setCurrentProduct] = React.useState<ProductWithRelations>(product);
  const [events, setEvents] = React.useState<ProductEventData[]>([]);
  const [isQrDialogOpen, setIsQrDialogOpen] = React.useState(false);

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

  // Determine status flags & styling
  const prodStatus = currentProduct.status;
  const isMaintenance = prodStatus === "maintenance";
  const isPending = prodStatus === "pending";
  const isInstallation = prodStatus === "installation";
  const isExpired = prodStatus === "expired";
  const isInstallationActive =
    isInstallation ||
    events.some((e) => e.event_type === "installation" && e.status === "active");

  let statusLabel = "Bergaransi";
  let statusColor: "emerald" | "amber" | "blue" | "red" | "zinc" = "emerald";

  if (isPending) {
    statusLabel = "Pending (Belum Instalasi)";
    statusColor = "zinc";
  } else if (isInstallationActive || isInstallation) {
    statusLabel = "Proses Instalasi";
    statusColor = "blue";
  } else if (isMaintenance) {
    statusLabel = "Maintenance";
    statusColor = "amber";
  } else if (isExpired) {
    statusLabel = "Garansi Berakhir (Expired)";
    statusColor = "red";
  } else {
    statusLabel = "Bergaransi";
    statusColor = "emerald";
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

  // Build badges for Product (Client badge before status badge)
  const clientBadge: EntityBadge[] = currentProduct.client?.client_name
    ? [
        {
          id: "client-badge",
          icon: Building2Icon,
          label: currentProduct.client.client_name,
          color: "zinc",
          className: "bg-zinc-800 text-zinc-100 border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 font-bold",
        },
      ]
    : [];

  const badges: EntityBadge[] = [
    ...clientBadge,
    {
      id: "status-badge",
      label: statusLabel,
      color: statusColor,
      className: (isInstallationActive || isMaintenance) ? "animate-pulse font-extrabold shadow-sm" : undefined,
    },
  ];

  // Build header actions
  const headerActions: HeaderAction[] = [
    {
      id: "download-photos",
      label: `Foto (${totalPhotoCount})`,
      icon: DownloadIcon,
      onClick: handleExportAllImages,
      disabled: isExportingAll || totalPhotoCount === 0,
      hideTextOnMobile: true,
      variant: "outline",
    },
    {
      id: "qr-code",
      label: "QR Code",
      icon: QrCodeIcon,
      onClick: () => {
        setIsQrDialogOpen(true);
      },
      hideTextOnMobile: true,
      variant: "outline",
    },
    {
      id: "edit-product",
      label: "Edit",
      icon: PencilIcon,
      onClick: onEdit,
      hideTextOnMobile: false,
      variant: "default",
      className: statusColor === "amber" ? "bg-amber-500 text-zinc-950 font-bold hover:bg-amber-400" : "bg-emerald-600 text-white font-bold hover:bg-emerald-500",
    },
  ];

  const clientId =
    (currentProduct.client as any)?.client_id ||
    currentProduct.current_client_id ||
    "";

  const clientAvatarUrl = clientId
    ? localStorage.getItem(`client_avatar_${clientId}`) || getClientAvatarUrl(clientId)
    : null;

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

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {headerActions.map((action) => {
            const ActionIcon = action.icon;
            return (
              <Button
                key={action.id}
                variant={action.variant || "outline"}
                size="sm"
                onClick={action.onClick}
                disabled={action.disabled}
                className={cn("gap-1.5 text-xs rounded-xl", action.className)}
              >
                {ActionIcon && <ActionIcon className="size-3.5" />}
                <span
                  className={cn(
                    action.hideTextOnMobile ? "hidden sm:inline" : "inline"
                  )}
                >
                  {action.label}
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* ── Global Entity Profile Banner ── */}
      <EntityProfileBanner
        variant={
          isPending
            ? "white"
            : isExpired
            ? "red"
            : isMaintenance
            ? "orange"
            : isInstallationActive
            ? "blue"
            : "emerald"
        }
        profile={{
          type: "icon",
          icon: isPending ? ShieldCheckIcon : isExpired ? ShieldCheckIcon : isMaintenance ? Wrench : isInstallationActive ? Wrench : ShieldCheckIcon,
          containerClassName: cn(
            isPending
              ? "bg-zinc-500/10 text-zinc-700 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 shadow-xs"
              : isExpired
              ? "bg-red-500/10 text-red-500 border border-red-500/30 shadow-md"
              : isMaintenance
              ? "bg-orange-500/10 text-orange-500 border border-orange-500/20 animate-pulse ring-4 ring-orange-500/40 dark:ring-orange-400/40 shadow-md"
              : isInstallationActive
              ? "bg-blue-500/10 text-blue-500 border border-blue-500/20 animate-pulse ring-4 ring-blue-500/40 dark:ring-blue-400/40 shadow-md"
              : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
          ),
          overlay: currentProduct.client
            ? {
                type: "client_avatar",
                avatarUrl: clientAvatarUrl,
                fallbackInitials: getClientInitials(currentProduct.client.client_name),
                title: `Milik Klien: ${currentProduct.client.client_name}`,
                onClick: () => {
                  if (clientId) {
                    navigate(`/clients/${clientId}`);
                  }
                },
              }
            : undefined,
        }}
        title={currentProduct.product_name}
        subtitle={
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 rounded-md border border-border/80 bg-muted/30 font-mono text-[10px] sm:text-xs">
            <span className="text-muted-foreground font-medium">SN:</span>
            <span
              className={cn(
                "font-bold",
                isPending
                  ? "text-zinc-800 dark:text-zinc-200"
                  : isExpired
                  ? "text-red-600 dark:text-red-400"
                  : isMaintenance
                  ? "text-orange-600 dark:text-orange-400"
                  : isInstallationActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {currentProduct.serial_number}
            </span>
          </div>
        }
        meta={
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap pt-1 sm:pt-1.5">
            {currentProduct.model && (
              <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full border font-bold text-[10px] sm:text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                <TagIcon className="size-3 sm:size-3.5 shrink-0" />
                <span>{currentProduct.model}</span>
              </div>
            )}
            {currentProduct.power_capacity && (
              <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full border font-bold text-[10px] sm:text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                <BatteryChargingIcon className="size-3 sm:size-3.5 shrink-0" />
                <span>{currentProduct.power_capacity}</span>
              </div>
            )}
            {currentProduct.input_voltage && (
              <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full border font-bold text-[10px] sm:text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20">
                <ZapIcon className="size-3 sm:size-3.5 shrink-0" />
                <span>{currentProduct.input_voltage}</span>
              </div>
            )}
            {currentProduct.frequency && (
              <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full border font-bold text-[10px] sm:text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20">
                <ActivityIcon className="size-3 sm:size-3.5 shrink-0" />
                <span>{currentProduct.frequency}</span>
              </div>
            )}
          </div>
        }
        badges={badges}
        expandable={{
          isExpandable: true,
          defaultExpanded: false,
          expandTriggerLabel: "Tampilkan Spesifikasi Lengkap",
          collapseTriggerLabel: "Sembunyikan Spesifikasi",
          content: (
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
              <CompactDetailRow label="Nomor Seri" value={currentProduct.serial_number} />
              <CompactDetailRow label="Kode Produk" value={currentProduct.product_code} />
              <CompactDetailRow label="Nama Produk" value={currentProduct.product_name} isFullWidth />
              <CompactDetailRow label="Model Kode" value={currentProduct.model_code} />
              <CompactDetailRow label="Tahun Pembuatan" value={currentProduct.manufacture_year} />
              <CompactDetailRow label="Input Voltage" value={currentProduct.input_voltage} />
              <CompactDetailRow label="Output Voltage" value={currentProduct.output_voltage} />
              <CompactDetailRow label="Frekuensi" value={currentProduct.frequency} />
              <CompactDetailRow label="Jumlah Socket" value={currentProduct.socket_count} />
              <CompactDetailRow label="Soft Fuse" value={currentProduct.soft_fuse} />
              <CompactDetailRow label="Hard Fuse" value={currentProduct.hard_fuse} />
              <CompactDetailRow label="Ground Output" value={currentProduct.ground_output} isFullWidth />
            </div>
          ),
        }}
      />

      {/* ── Product Warranty & History ── */}
      <ProductWarrantyCard
        productId={currentProduct.product_id}
        productName={currentProduct.product_name}
        serialNumber={currentProduct.serial_number}
        productStatus={currentProduct.status}
      />

      {/* ── Event & Sub Event Accordions ── */}
      <div className="space-y-3 pt-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <ActivityIcon className="size-4 text-primary" />
          <span>Riwayat Event &amp; Dokumentasi</span>
        </h2>

        <ProductEventAccordion
          productId={currentProduct.product_id}
          serialNumber={currentProduct.serial_number}
          onEventsUpdated={refreshData}
        />
      </div>

      {/* ── Product Activity Timeline Section ── */}
      <div className="pt-6 border-t border-border/60 space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Log Aktivitas
        </h2>
        <ProductActivityTimeline productId={currentProduct.product_id} product={currentProduct} />
      </div>

      {/* ── Dialog QR Code Modal ── */}
      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-zinc-950 border-zinc-800 text-zinc-100 p-6 shadow-2xl">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-zinc-100">
              <QrCodeIcon className="h-5 w-5 text-emerald-500" />
              <span>Kode QR Resmi Aset Produk</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Pindai atau pratinjau halaman resmi produk dengan Serial Number: {currentProduct.serial_number}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center space-y-4 py-4">
            <div className="relative p-3 bg-white rounded-2xl shadow-inner border-2 border-zinc-700 shrink-0">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
                  `${window.location.origin}/p/${currentProduct.serial_number}`
                )}`}
                alt={`QR Code ${currentProduct.serial_number}`}
                className="w-48 h-48 object-contain"
              />
            </div>
            <div className="text-center space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Serial Number (SN)
              </span>
              <h4 className="text-lg font-mono font-bold text-emerald-400">
                {currentProduct.serial_number}
              </h4>
              <p className="text-xs text-zinc-300 font-medium">
                {currentProduct.product_name}
              </p>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-zinc-800">
            <DialogClose asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs rounded-xl"
              >
                Kembali
              </Button>
            </DialogClose>
            <Button
              size="sm"
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl gap-1.5"
              onClick={() => {
                window.open(`${window.location.origin}/p/${currentProduct.serial_number}`, "_blank");
              }}
            >
              <ExternalLinkIcon className="h-3.5 w-3.5" />
              <span>Preview</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
