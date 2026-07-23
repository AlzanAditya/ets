import * as React from "react";
import {
  PackageIcon,
  ZapIcon,
  ShieldCheckIcon,
  FileTextIcon,
  PencilIcon,
  ArrowLeftIcon,
  QrCodeIcon,
  LandmarkIcon,
  UserCheckIcon,
  Building2Icon,
  TagIcon,
  CalendarIcon,
  CpuIcon,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { ProductActivityTimeline } from "./product-activity-timeline";
import type { ProductWithRelations } from "@/services/products.service";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  active: "Aktif (Gudang)",
  deployed: "Terpasang (Klien)",
  sold: "Terjual",
  maintenance: "Servis / Maintenance",
  inactive: "Nonaktif",
  retired: "Pensiun",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  deployed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  sold: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  maintenance: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  inactive: "bg-muted text-muted-foreground border-transparent",
  retired: "bg-destructive/10 text-destructive border-destructive/20",
};

interface ValueDisplayProps {
  label: string;
  value?: string | number | null;
  icon?: React.ElementType;
  className?: string;
  badge?: React.ReactNode;
}

function ValueDisplay({ label, value, icon: Icon, className, badge }: ValueDisplayProps) {
  const displayVal = value !== null && value !== undefined && String(value).trim() !== "" ? String(value) : "—";
  return (
    <div className={cn("space-y-1 p-2.5 rounded-xl bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors", className)}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        {Icon && <Icon className="size-3.5 text-primary/70 shrink-0" />}
        <span>{label}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground break-words">
          {displayVal}
        </span>
        {badge}
      </div>
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
  signedImages = [],
}: ProductViewModeProps) {
  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 w-full space-y-6 pb-12">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full sm:hidden"
              onClick={onBack}
            >
              <ArrowLeftIcon className="size-4" />
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {product.nama_produk}
            </h1>
            <Badge
              variant="outline"
              className={cn("text-xs font-semibold px-2.5 py-0.5", STATUS_COLORS[product.status] ?? "")}
            >
              {STATUS_LABELS[product.status] ?? product.status}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-mono">
            <span>SN: <strong className="text-foreground font-bold">{product.nomor_seri}</strong></span>
            {product.product_code && (
              <>
                <span>•</span>
                <span>Kode: <strong className="text-foreground">{product.product_code}</strong></span>
              </>
            )}
            {product.brand && (
              <>
                <span>•</span>
                <span className="font-sans">Brand: <strong className="text-foreground">{product.brand}</strong></span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="hidden sm:inline-flex gap-1.5 text-xs rounded-xl"
          >
            <ArrowLeftIcon className="size-3.5" />
            Kembali
          </Button>

          <a
            href={`https://qr.zanxa.studio/p/${product.nomor_seri}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-xl">
              <QrCodeIcon className="size-3.5 text-emerald-500" />
              QR Code
            </Button>
          </a>

          <Button
            onClick={onEdit}
            size="sm"
            className="gap-1.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <PencilIcon className="size-3.5" />
            Edit Produk
          </Button>
        </div>
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Accordions for Product Info & Specs */}
        <div className="lg:col-span-2 space-y-4">
          <Accordion
            type="multiple"
            defaultValue={["informasi", "spesifikasi", "catatan"]}
            className="w-full space-y-3"
          >
            {/* Accordion 1: Informasi Produk */}
            <AccordionItem
              value="informasi"
              className="border rounded-2xl px-4 py-1 bg-card shadow-2xs"
            >
              <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
                <div className="flex items-center gap-2 text-foreground">
                  <PackageIcon className="size-4 text-primary" />
                  <span>Informasi Produk</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ValueDisplay label="Nomor Seri" value={product.nomor_seri} icon={TagIcon} />
                  <ValueDisplay label="Kode Produk" value={product.product_code} icon={TagIcon} />
                  <ValueDisplay label="Nama Produk" value={product.nama_produk} icon={PackageIcon} className="sm:col-span-2" />
                  <ValueDisplay label="Kategori" value={product.category} icon={TagIcon} />
                  <ValueDisplay label="Brand" value={product.brand} icon={Building2Icon} />
                  <ValueDisplay label="Tipe / Model" value={product.tipe_kode} icon={CpuIcon} />
                  <ValueDisplay label="Tahun Pembuatan" value={product.tahun_pembuatan} icon={CalendarIcon} />
                  <ValueDisplay
                    label="Status"
                    value={STATUS_LABELS[product.status] ?? product.status}
                    icon={TagIcon}
                  />
                  <ValueDisplay
                    label="Klien Pemegang"
                    value={product.client ? product.client.customer_name : "Tidak ada"}
                    icon={UserCheckIcon}
                  />
                  <ValueDisplay
                    label="Cabang / Gudang"
                    value={product.branch ? product.branch.branch_name : "Tidak ada"}
                    icon={LandmarkIcon}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Accordion 2: Spesifikasi Produk */}
            <AccordionItem
              value="spesifikasi"
              className="border rounded-2xl px-4 py-1 bg-card shadow-2xs"
            >
              <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
                <div className="flex items-center gap-2 text-foreground">
                  <ZapIcon className="size-4 text-amber-500" />
                  <span>Spesifikasi Produk</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ValueDisplay label="Input" value={product.input} icon={ZapIcon} />
                  <ValueDisplay label="Output" value={product.output} icon={ZapIcon} />
                  <ValueDisplay label="Frekuensi" value={product.frekuensi} icon={ZapIcon} />
                  <ValueDisplay label="Jumlah Socket" value={product.jumlah_socket} icon={ZapIcon} />
                  <ValueDisplay label="Range Daya" value={product.range_daya} icon={ZapIcon} className="sm:col-span-2" />
                  <ValueDisplay label="Soft Fuse Protection" value={product.soft_fuse_protection} icon={ShieldCheckIcon} />
                  <ValueDisplay label="Hard Fuse Protection" value={product.hard_fuse_protection} icon={ShieldCheckIcon} />
                  <ValueDisplay label="Ground Output" value={product.ground_output} icon={ShieldCheckIcon} className="sm:col-span-2" />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Accordion 3: Catatan */}
            <AccordionItem
              value="catatan"
              className="border rounded-2xl px-4 py-1 bg-card shadow-2xs"
            >
              <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
                <div className="flex items-center gap-2 text-foreground">
                  <FileTextIcon className="size-4 text-primary" />
                  <span>Catatan</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4">
                <ValueDisplay
                  label="Keterangan / Tambahan Opsional"
                  value={product.tambahan_optional}
                  icon={FileTextIcon}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Right Column: Photo Gallery Card */}
        <div className="space-y-4">
          <div className="bg-card border rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <ImageIcon className="size-4 text-primary" />
                Foto Produk ({signedImages.length})
              </h3>
            </div>

            {signedImages.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground/60 bg-muted/20">
                <ImageIcon className="size-8 opacity-40" />
                <span className="text-xs">Tidak ada foto produk</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {signedImages.map((img, idx) => (
                  <a
                    key={img.storagePath}
                    href={img.fullUrl ?? img.thumbUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative aspect-square overflow-hidden rounded-xl border bg-muted"
                  >
                    <img
                      src={img.thumbUrl ?? img.fullUrl ?? ""}
                      alt={`Foto Produk ${idx + 1}`}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Product Activity Timeline Section ── */}
      <div className="pt-4 border-t">
        <ProductActivityTimeline productId={product.product_id} product={product} />
      </div>
    </div>
  );
}
