import * as React from "react";
import {
  MapPinIcon,
  PencilIcon,
  UploadIcon,
  Trash2Icon,
  PackageIcon,
  WrenchIcon,
  MailIcon,
  PhoneIcon,
  ExternalLinkIcon,
} from "lucide-react";
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
  onBack?: () => void;
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

  const locationText = React.useMemo(() => {
    return [client.address, client.city, client.province].filter(Boolean).join(", ") || (client.city ? `${client.city}${client.province ? `, ${client.province}` : ""}` : "");
  }, [client.address, client.city, client.province]);

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 w-full space-y-6 pb-12">
      {/* ── Client Profile Banner Card with Avatar, Badge Metrics & Contacts ── */}
      <div className="bg-card border rounded-2xl p-5 md:p-6 shadow-2xs space-y-4">
        {/* Main Info Row */}
        <div className="flex flex-row items-start gap-4 md:gap-6">
          {/* Avatar Column */}
          <div className="flex flex-col items-center gap-3 shrink-0">
            <div className="relative size-20 md:size-24 rounded-full shrink-0 border-2 border-border/80 bg-muted/40 flex items-center justify-center shadow-sm">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={client.client_name}
                  className="size-[74px] md:size-[88px] rounded-full object-cover"
                />
              ) : (
                <div className="size-[74px] md:size-[88px] rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl md:text-2xl font-bold tracking-wider select-none">
                  {getClientInitials(client.client_name)}
                </div>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="absolute bottom-0 right-0 p-1.5 md:p-2 rounded-full bg-emerald-600 text-white shadow-md hover:scale-105 transition-transform cursor-pointer border-2 border-background"
                    title="Ubah foto profil"
                  >
                    <PencilIcon className="size-3 md:size-3.5" />
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

            {/* DESKTOP ONLY: 2 Badges placed strictly UNDER Avatar */}
            <div className="hidden md:flex items-center gap-2">
              {/* Green Total Products Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/80 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                <PackageIcon className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{clientProducts.length}</span>
              </div>
              {/* Amber Maintenance Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/80 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-sm">
                <WrenchIcon className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>{maintenanceProducts.length}</span>
              </div>
            </div>
          </div>

          {/* Details Column (Name, Kode Klien, Contact Info) */}
          <div className="flex-1 min-w-0 space-y-2.5 pt-1">
            {/* Customer Name + Edit Icon */}
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-2xl font-bold text-foreground truncate">
                {client.client_name}
              </h2>
              <button
                type="button"
                onClick={onEdit}
                className="p-1 md:px-2.5 md:py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs shrink-0 flex items-center gap-1.5 text-xs font-semibold"
                title="Edit Klien"
              >
                <PencilIcon className="size-3.5" />
                <span className="hidden md:inline">Edit</span>
              </button>
            </div>

            {/* Kode Klien Badge + MOBILE ONLY Badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/80 bg-muted/30 font-mono">
                <span className="text-muted-foreground">Kode</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{client.client_code || "—"}</span>
              </div>

              {/* MOBILE ONLY: Badges next to Kode Klien */}
              <div className="flex md:hidden items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/80 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <PackageIcon className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{clientProducts.length}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-500/80 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs">
                  <WrenchIcon className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>{maintenanceProducts.length}</span>
                </div>
              </div>
            </div>

            {/* DESKTOP ONLY: Contact Details beneath Kode Klien (Flex Wrap) */}
            <div className="hidden md:flex flex-wrap items-center gap-x-6 gap-y-2.5 pt-2 text-sm text-foreground font-medium">
              {client.email && (
                <a
                  href={`mailto:${client.email}`}
                  className="flex items-center gap-2 hover:text-emerald-500 transition-colors"
                >
                  <MailIcon className="size-4 text-emerald-500 shrink-0" />
                  <span className="opacity-80">{client.email}</span>
                </a>
              )}
              {client.phone_number && (
                <a
                  href={`tel:${client.phone_number}`}
                  className="flex items-center gap-2 hover:text-emerald-500 transition-colors"
                >
                  <PhoneIcon className="size-4 text-emerald-500 shrink-0" />
                  <span className="opacity-80">{client.phone_number}</span>
                </a>
              )}
              {locationText && (
                <div className="flex items-center gap-2 w-full pt-0.5">
                  <MapPinIcon className="size-4 text-emerald-500 shrink-0" />
                  <span className="opacity-80">{locationText}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MOBILE ONLY: Contact Details List (Dynamic layout wrapping 1, 2, or 3 per row depending on width) */}
        <div className="md:hidden flex flex-wrap gap-2 pt-2.5 border-t border-border/40 text-sm">
          {client.email && (
            <a
              href={`mailto:${client.email}`}
              className="flex-1 min-w-[160px] flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <MailIcon className="size-4 text-emerald-500 shrink-0" />
                <span className="text-foreground text-xs sm:text-sm truncate font-medium opacity-80">{client.email}</span>
              </div>
              <ExternalLinkIcon className="size-3.5 text-emerald-500 shrink-0" />
            </a>
          )}

          {client.phone_number && (
            <a
              href={`tel:${client.phone_number}`}
              className="flex-1 min-w-[160px] flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <PhoneIcon className="size-4 text-emerald-500 shrink-0" />
                <span className="text-foreground text-xs sm:text-sm truncate font-medium opacity-80">{client.phone_number}</span>
              </div>
              <ExternalLinkIcon className="size-3.5 text-emerald-500 shrink-0" />
            </a>
          )}

          {locationText && (
            <div className="flex-1 min-w-[160px] flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-border/40 bg-muted/20">
              <div className="flex items-center gap-2.5 min-w-0">
                <MapPinIcon className="size-4 text-emerald-500 shrink-0" />
                <span className="text-foreground text-xs sm:text-sm truncate font-medium opacity-80">{locationText}</span>
              </div>
              <ExternalLinkIcon className="size-3.5 text-emerald-500 shrink-0" />
            </div>
          )}
        </div>
      </div>

      {/* ── Table Daftar Produk Milik Klien ── */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <PackageIcon className="size-5 text-primary" />
              Daftar Produk Milik Klien
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Produk terpasang dan terdaftar di bawah {client.client_name}
            </p>
          </div>
        </div>

        <DataTable
          persistenceKey={`client-products-v2-${client.client_id}`}
          columns={clientProductColumns}
          data={displayedProducts}
          addButtonLabel=""
          onRowClick={(row) => onRowClickProduct(row.product_name || row.serial_number || row.product_id)}
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

