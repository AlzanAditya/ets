import * as React from "react";
import {
  MapPinIcon,
  PencilIcon,
  PackageIcon,
  WrenchIcon,
  MailIcon,
  PhoneIcon,
  ArrowLeftIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DataTable, type DataTableRow } from "@/components/data-table";
import {
  EntityProfileBanner,
  type EntityBadge,
  type EntityDetailItem,
  type HeaderAction,
} from "@/components/entity-profile-banner";
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

  const locationText = React.useMemo(() => {
    return (
      [client.address, client.city, client.province].filter(Boolean).join(", ") ||
      (client.city ? `${client.city}${client.province ? `, ${client.province}` : ""}` : "")
    );
  }, [client.address, client.city, client.province]);

  // Construct Badges using EntityProfileBanner format
  const badges: EntityBadge[] = [
    {
      id: "total-products",
      icon: PackageIcon,
      value: clientProducts.length,
      color: "emerald",
    },
    {
      id: "maintenance-products",
      icon: WrenchIcon,
      value: maintenanceProducts.length,
      color: "amber",
    },
  ];

  // Construct Details using EntityProfileBanner format
  const details: EntityDetailItem[] = [];
  if (client.email) {
    details.push({
      id: "email",
      icon: MailIcon,
      value: client.email,
      href: `mailto:${client.email}`,
    });
  }
  if (client.phone_number) {
    details.push({
      id: "phone",
      icon: PhoneIcon,
      value: client.phone_number,
      href: `tel:${client.phone_number}`,
    });
  }
  if (locationText) {
    details.push({
      id: "location",
      icon: MapPinIcon,
      value: locationText,
    });
  }

  // Header actions using EntityProfileBanner format
  const headerActions: HeaderAction[] = [
    {
      id: "edit",
      label: "Edit",
      icon: PencilIcon,
      onClick: onEdit,
      hideTextOnMobile: false,
      className: "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold",
    },
  ];

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 w-full space-y-6 pb-12">
      {/* ── Top Header Navigation Bar Outside Banner ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground rounded-xl"
        >
          <ArrowLeftIcon className="size-4" />
          <span>Kembali ke Daftar Klien</span>
        </Button>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {headerActions.map((action) => {
            const ActionIcon = action.icon;
            return (
              <Button
                key={action.id}
                variant={action.variant || "default"}
                size="sm"
                onClick={action.onClick}
                disabled={action.disabled}
                className={cn("gap-1.5 text-xs rounded-xl", action.className)}
              >
                {ActionIcon && <ActionIcon className="size-3.5" />}
                <span>{action.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* ── Global Entity Profile Banner ── */}
      <EntityProfileBanner
        profile={{
          type: "image",
          avatarUrl,
          fallbackInitials: getClientInitials(client.client_name),
          overlay: {
            type: "pencil",
            title: "Ubah foto profil",
            fileInputRef,
            onFileChange: handleAvatarChange,
            onRemoveClick: handleAvatarRemove,
          },
        }}
        title={client.client_name}
        meta={
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 rounded-md border border-border/80 bg-muted/30 font-mono text-[10px] sm:text-xs">
            <span className="text-muted-foreground font-medium">Kode:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              {client.client_code || "—"}
            </span>
          </div>
        }
        badges={badges}
        details={details}
      />

      {/* ── Table Daftar Produk Milik Klien ── */}
      <div className="space-y-4 pt-4 border-t border-border/60">
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
          onRowClick={(row) =>
            onRowClickProduct(row.product_name || row.serial_number || row.product_id)
          }
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
