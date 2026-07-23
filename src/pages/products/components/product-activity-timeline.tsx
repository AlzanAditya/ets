import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ClockIcon,
  UserIcon,
  FileTextIcon,
  PlusCircleIcon,
  ArrowRightLeftIcon,
  WrenchIcon,
  CheckCircle2Icon,
  RefreshCwIcon,
} from "lucide-react";
import { DataTable, type DataTableRow } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import type { ProductWithRelations } from "@/services/products.service";
import { safeUUID } from "@/lib/utils";

export interface ActivityLogItem extends DataTableRow {
  id: string;
  timestamp: string;
  activity: string;
  performer: string;
  notes: string;
  type?: "create" | "update" | "transfer" | "status" | "maintenance" | "general";
}

const STORAGE_KEY_PREFIX = "product_activity_logs_v1_";

export function loadActivityLogs(
  productId: string,
  product?: ProductWithRelations | null
): ActivityLogItem[] {
  if (!productId) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + productId);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Failed to parse activity logs", err);
  }

  // Generate seed logs if no logs stored yet
  const seeds: ActivityLogItem[] = [];
  const createdAt = product?.created_at
    ? new Date(product.created_at).toISOString()
    : new Date(Date.now() - 86400000 * 30).toISOString();

  // 1. Creation log
  seeds.push({
    id: safeUUID(),
    timestamp: createdAt,
    activity: "Produk Dibuat",
    performer: "System Admin",
    notes: `Registrasi awal produk ${product?.nama_produk || ""} (SN: ${product?.nomor_seri || "N/A"})`,
    type: "create",
  });

  // 2. Client / Branch location assignment log
  if (product?.client) {
    seeds.push({
      id: safeUUID(),
      timestamp: new Date(new Date(createdAt).getTime() + 3600000).toISOString(),
      activity: "Penempatan ke Klien",
      performer: "Tim Logistik",
      notes: `Produk diserahterimakan & terpasang di ${product.client.customer_name}`,
      type: "transfer",
    });
  } else if (product?.branch) {
    seeds.push({
      id: safeUUID(),
      timestamp: new Date(new Date(createdAt).getTime() + 1800000).toISOString(),
      activity: "Penyimpanan di Gudang",
      performer: "Gudang Ops",
      notes: `Aset disimpan di ${product.branch.branch_name}`,
      type: "transfer",
    });
  }

  // 3. Maintenance log if status is maintenance
  if (product?.status === "maintenance") {
    seeds.push({
      id: safeUUID(),
      timestamp: product.updated_at
        ? new Date(product.updated_at).toISOString()
        : new Date(Date.now() - 3600000 * 5).toISOString(),
      activity: "Maintenance Dimulai",
      performer: "Tim Teknisi",
      notes: "Status diubah ke Servis / Maintenance untuk pemeriksaan berkala",
      type: "maintenance",
    });
  } else if (product?.updated_at && product.updated_at !== product.created_at) {
    seeds.push({
      id: safeUUID(),
      timestamp: new Date(product.updated_at).toISOString(),
      activity: "Informasi Diperbarui",
      performer: "System Admin",
      notes: "Pembaruan data spesifikasi dan identitas produk",
      type: "update",
    });
  }

  // Sort descending by timestamp
  seeds.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Save seed to localStorage
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + productId, JSON.stringify(seeds));
  } catch {}

  return seeds;
}

export function addActivityLog(
  productId: string,
  log: Omit<ActivityLogItem, "id">,
  product?: ProductWithRelations | null
) {
  const currentLogs = loadActivityLogs(productId, product);
  const newEntry: ActivityLogItem = {
    ...log,
    id: safeUUID(),
  };
  const updated = [newEntry, ...currentLogs];
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + productId, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to save activity log", err);
  }
  return updated;
}

function getActivityBadge(type?: string, activity?: string) {
  if (type === "create" || activity?.includes("Dibuat")) {
    return (
      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 text-[11px] font-semibold">
        <PlusCircleIcon className="size-3" />
        {activity}
      </Badge>
    );
  }
  if (type === "transfer" || activity?.includes("Penempatan") || activity?.includes("Penyimpanan")) {
    return (
      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1 text-[11px] font-semibold">
        <ArrowRightLeftIcon className="size-3" />
        {activity}
      </Badge>
    );
  }
  if (type === "maintenance" || activity?.includes("Maintenance") || activity?.includes("Servis")) {
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1 text-[11px] font-semibold">
        <WrenchIcon className="size-3" />
        {activity}
      </Badge>
    );
  }
  if (type === "update" || activity?.includes("Diperbarui") || activity?.includes("Status")) {
    return (
      <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 gap-1 text-[11px] font-semibold">
        <RefreshCwIcon className="size-3" />
        {activity}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-muted text-muted-foreground gap-1 text-[11px]">
      <CheckCircle2Icon className="size-3" />
      {activity}
    </Badge>
  );
}

const TIMELINE_COLUMNS: ColumnDef<ActivityLogItem>[] = [
  {
    accessorKey: "timestamp",
    header: "Waktu",
    cell: ({ row }) => {
      const date = new Date(row.original.timestamp);
      const isValid = !isNaN(date.getTime());
      const formattedDate = isValid
        ? date.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "—";
      const formattedTime = isValid
        ? date.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";

      return (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
          <ClockIcon className="size-3.5 shrink-0 text-muted-foreground/70" />
          <span className="font-mono font-medium text-foreground">{formattedDate}</span>
          <span className="text-[11px]">{formattedTime}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "activity",
    header: "Aktivitas",
    cell: ({ row }) => getActivityBadge(row.original.type, row.original.activity),
  },
  {
    accessorKey: "performer",
    header: "Pelaksana",
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground whitespace-nowrap">
        <UserIcon className="size-3.5 text-muted-foreground" />
        <span>{row.original.performer || "System Admin"}</span>
      </div>
    ),
  },
  {
    accessorKey: "notes",
    header: "Keterangan",
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-[200px]">
        <FileTextIcon className="size-3.5 text-muted-foreground/60 shrink-0" />
        <span>{row.original.notes || "—"}</span>
      </div>
    ),
  },
];

interface ProductActivityTimelineProps {
  productId: string;
  product?: ProductWithRelations | null;
}

export function ProductActivityTimeline({
  productId,
  product,
}: ProductActivityTimelineProps) {
  const [logs, setLogs] = React.useState<ActivityLogItem[]>(() =>
    loadActivityLogs(productId, product)
  );

  React.useEffect(() => {
    setLogs(loadActivityLogs(productId, product));
  }, [productId, product]);

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <ClockIcon className="size-4 text-primary" />
            Product Activity Timeline
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Log histori aktivitas, penempatan, dan pembaruan data produk
          </p>
        </div>
        <Badge variant="secondary" className="font-mono text-xs px-2.5 py-0.5">
          {logs.length} Catatan
        </Badge>
      </div>

      <DataTable
        persistenceKey={`product-timeline-${productId}`}
        columns={TIMELINE_COLUMNS}
        data={logs}
        addButtonLabel=""
        defaultTab="all"
        tabs={[{ value: "all", label: "Semua Aktivitas", badge: logs.length }]}
      />
    </div>
  );
}
