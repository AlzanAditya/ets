import * as React from "react";
import {
  UserIcon,
  MapPinIcon,
  FileTextIcon,
  PencilIcon,
  ArrowLeftIcon,
  UploadIcon,
  Trash2Icon,
  PackageIcon,
  WrenchIcon,
  MailIcon,
  PhoneIcon,
  MessageSquareIcon,
  Building2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, type DataTableRow } from "@/components/data-table";
import type { ClientRow, ProductRow } from "@/types/database";
import type { ColumnDef } from "@tanstack/react-table";

function getClientInitials(name: string): string {
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

interface ValueDisplayProps {
  label: string;
  value?: string | number | null;
  icon?: React.ElementType;
  className?: string;
}

function ValueDisplay({ label, value, icon: Icon, className }: ValueDisplayProps) {
  const displayVal =
    value !== null && value !== undefined && String(value).trim() !== ""
      ? String(value)
      : "—";
  return (
    <div className={`space-y-1 p-3 rounded-xl bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors ${className || ""}`}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        {Icon && <Icon className="size-3.5 text-primary/70 shrink-0" />}
        <span>{label}</span>
      </div>
      <div className="text-sm font-semibold text-foreground break-words">
        {displayVal}
      </div>
    </div>
  );
}

type ProductRowWithId = ProductRow & DataTableRow;

interface ClientViewModeProps {
  client: ClientRow;
  clientProducts: ProductRowWithId[];
  clientProductColumns: ColumnDef<ProductRowWithId>[];
  avatarUrl: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveAvatar?: () => void;
  onAvatarChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAvatarRemove?: () => void;
  onEdit: () => void;
  onBack: () => void;
  onRowClickProduct: (productId: string) => void;
}

export function ClientViewMode({
  client,
  clientProducts,
  clientProductColumns,
  avatarUrl,
  fileInputRef,
  handleFileChange,
  handleRemoveAvatar,
  onAvatarChange,
  onAvatarRemove,
  onEdit,
  onBack,
  onRowClickProduct,
}: ClientViewModeProps) {
  const handleAvatarChange = onAvatarChange || handleFileChange;
  const handleAvatarRemove = onAvatarRemove || handleRemoveAvatar;
  const [productTab, setProductTab] = React.useState<string>("all");

  const maintenanceProducts = React.useMemo(
    () => clientProducts.filter((p) => p.status === "maintenance"),
    [clientProducts]
  );

  const displayedProducts = React.useMemo(() => {
    if (productTab === "maintenance") return maintenanceProducts;
    return clientProducts;
  }, [productTab, maintenanceProducts, clientProducts]);

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 w-full space-y-6 pb-12">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full sm:hidden"
              onClick={onBack}
            >
              <ArrowLeftIcon className="size-4" />
            </Button>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {client.customer_name}
            </h1>
            {client.customer_name_alias && (
              <Badge variant="outline" className="text-xs">
                {client.customer_name_alias}
              </Badge>
            )}
          </div>
          <p className="text-xs font-mono text-muted-foreground">
            Kode Klien: <strong className="text-foreground">{client.client_code}</strong>
          </p>
        </div>

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

          <Button
            onClick={onEdit}
            size="sm"
            className="gap-1.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <PencilIcon className="size-3.5" />
            Edit Profil Klien
          </Button>
        </div>
      </div>

      {/* ── Client Profile Banner Card with Avatar & Quick Metrics ── */}
      <div className="flex flex-col md:flex-row items-center gap-6 bg-card border rounded-2xl p-6 shadow-2xs">
        {/* Avatar Area */}
        <div className="relative size-[90px] rounded-full shrink-0 border-2 border-border/80 bg-muted/40 flex items-center justify-center group shadow-sm">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={client.customer_name}
              className="size-[86px] rounded-full object-cover"
            />
          ) : (
            <div className="size-[86px] rounded-full bg-primary/15 text-primary flex items-center justify-center text-2xl font-bold tracking-wider select-none">
              {getClientInitials(client.customer_name)}
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground shadow-md hover:scale-105 transition-transform cursor-pointer border-2 border-background"
                title="Ubah foto profil"
              >
                <PencilIcon className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 rounded-xl">
              <DropdownMenuItem
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer gap-2"
              >
                <UploadIcon className="size-4" />
                <span>{avatarUrl ? "Ganti Foto Profil" : "Unggah Foto Profil"}</span>
              </DropdownMenuItem>
              {avatarUrl && (
                <DropdownMenuItem
                  onClick={handleAvatarRemove}
                  className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2Icon className="size-4" />
                  <span>Hapus Foto Profil</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>

        {/* Client Core Details */}
        <div className="flex-1 text-center md:text-left min-w-0 space-y-2">
          <div>
            <h2 className="text-xl font-bold text-foreground truncate">
              {client.customer_name}
            </h2>
            {client.customer_name_alias && (
              <p className="text-xs text-muted-foreground">
                Alias / Panggilan: <span className="font-semibold text-foreground">{client.customer_name_alias}</span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            {client.email && (
              <span className="flex items-center gap-1">
                <MailIcon className="size-3.5 text-primary/70" />
                {client.email}
              </span>
            )}
            {client.phone_number && (
              <span className="flex items-center gap-1">
                <PhoneIcon className="size-3.5 text-primary/70" />
                {client.phone_number}
              </span>
            )}
            {client.whatsapp_number && (
              <span className="flex items-center gap-1">
                <MessageSquareIcon className="size-3.5 text-emerald-500" />
                {client.whatsapp_number}
              </span>
            )}
            {client.city && (
              <span className="flex items-center gap-1">
                <MapPinIcon className="size-3.5 text-primary/70" />
                {client.city}
                {client.province ? `, ${client.province}` : ""}
              </span>
            )}
          </div>
        </div>

        {/* Metric Summary Badges / Chips */}
        <div className="flex sm:flex-col gap-2 shrink-0 border-t sm:border-t-0 sm:border-l pt-4 sm:pt-0 sm:pl-6 w-full sm:w-auto justify-center">
          <div className="flex items-center gap-3 bg-muted/40 border px-3.5 py-2 rounded-xl">
            <PackageIcon className="size-4 text-blue-500 shrink-0" />
            <div>
              <div className="text-[11px] text-muted-foreground font-medium">Total Produk</div>
              <div className="text-sm font-bold text-foreground">{clientProducts.length} Aset</div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 rounded-xl">
            <WrenchIcon className="size-4 text-amber-600 shrink-0" />
            <div>
              <div className="text-[11px] text-amber-700 font-medium">Dalam Maintenance</div>
              <div className="text-sm font-bold text-amber-600">{maintenanceProducts.length} Aset</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Accordion Sections for Client Info ── */}
      <Accordion
        type="multiple"
        defaultValue={["kontak", "lokasi", "catatan"]}
        className="w-full space-y-3"
      >
        {/* Section 1: Informasi Client & Kontak */}
        <AccordionItem
          value="kontak"
          className="border rounded-2xl px-4 py-1 bg-card shadow-2xs"
        >
          <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
            <div className="flex items-center gap-2 text-foreground">
              <UserIcon className="size-4 text-primary" />
              <span>Informasi Client & Kontak</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <ValueDisplay label="Kode Klien" value={client.client_code} icon={Building2Icon} />
              <ValueDisplay label="Nama Perusahaan / Pelanggan" value={client.customer_name} icon={UserIcon} />
              <ValueDisplay label="Nama Alias (Nickname)" value={client.customer_name_alias} icon={UserIcon} />
              <ValueDisplay label="Email" value={client.email} icon={MailIcon} />
              <ValueDisplay label="No. Telepon" value={client.phone_number} icon={PhoneIcon} />
              <ValueDisplay label="No. WhatsApp" value={client.whatsapp_number} icon={MessageSquareIcon} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 2: Informasi Alamat & Lokasi */}
        <AccordionItem
          value="lokasi"
          className="border rounded-2xl px-4 py-1 bg-card shadow-2xs"
        >
          <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
            <div className="flex items-center gap-2 text-foreground">
              <MapPinIcon className="size-4 text-primary" />
              <span>Lokasi & Alamat Lengkap</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <ValueDisplay label="Alamat Lengkap" value={client.address} icon={MapPinIcon} className="sm:col-span-2 lg:col-span-4" />
              <ValueDisplay label="Kota" value={client.city} icon={MapPinIcon} />
              <ValueDisplay label="Provinsi" value={client.province} icon={MapPinIcon} />
              <ValueDisplay label="Kode Pos" value={client.postal_code} icon={MapPinIcon} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Section 3: Catatan */}
        <AccordionItem
          value="catatan"
          className="border rounded-2xl px-4 py-1 bg-card shadow-2xs"
        >
          <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
            <div className="flex items-center gap-2 text-foreground">
              <FileTextIcon className="size-4 text-primary" />
              <span>Catatan Tambahan</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-4">
            <ValueDisplay label="Catatan Keterangan" value={client.notes} icon={FileTextIcon} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* ── Table Daftar Produk Milik Klien ── */}
      <div className="space-y-4 pt-6 border-t">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <PackageIcon className="size-5 text-primary" />
              Daftar Produk Milik Klien
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Produk terpasang dan terdaftar di bawah {client.customer_name}
            </p>
          </div>
          <Badge variant="secondary" className="font-mono text-xs px-2.5 py-1">
            {clientProducts.length} Produk
          </Badge>
        </div>

        <DataTable
          persistenceKey={`client-products-v2-${client.client_id}`}
          columns={clientProductColumns}
          data={displayedProducts}
          addButtonLabel=""
          onRowClick={(row) => onRowClickProduct(row.product_id)}
          activeTab={productTab}
          onTabChange={setProductTab}
          tabs={[
            { value: "all", label: "Semua Produk", badge: clientProducts.length },
            { value: "maintenance", label: "Maintenance", badge: maintenanceProducts.length },
          ]}
        />
      </div>
    </div>
  );
}
