import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { UsersIcon } from "lucide-react";
import { toast } from "sonner";

import {
  useClients,
  useCreateClientMutation,
  useUpdateClientMutation,
} from "@/hooks/use-clients";
import { useTableSchema } from "@/hooks/use-table-schema";
import { mergeDynamicColumns } from "@/lib/dynamic-columns";
import { DataTable, type DataTableRow } from "@/components/data-table";
import { TableDrawer } from "@/components/table-drawer";
import { MetricCards } from "@/components/metric-cards";
import { PageContent } from "@/components/page-content";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MetricCardItem } from "@/types/metrics";
import type { ClientRow, ClientInsert } from "@/types/database";

// ─── Default Empty Fields ──────────────────────────────────────────────────────

function emptyFields(): ClientInsert {
  return {
    client_code: "",
    customer_name: "",
    customer_name_alias: null,
    email: null,
    phone_number: null,
    whatsapp_number: null,
    address: null,
    city: null,
    province: null,
    postal_code: null,
    notes: null,
  };
}

// ─── Pinned Columns (rich renderers — always shown first) ─────────────────────
// Columns here are matched by accessorKey/id and take priority over auto-generated
// columns. Any DB column NOT listed here will be auto-added to the dropdown.

type ClientRowWithId = ClientRow & DataTableRow;

const PINNED_COLUMNS: ColumnDef<ClientRowWithId>[] = [
  {
    accessorKey: "client_code",
    header: "Kode Klien",
    cell: ({ row }) => (
      <span className="font-mono text-xs font-semibold tracking-wider text-foreground bg-muted px-1.5 py-0.5 rounded">
        {row.original.client_code}
      </span>
    ),
  },
  {
    accessorKey: "customer_name",
    header: "Nama Pelanggan",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.customer_name}</span>
    ),
  },
  {
    accessorKey: "customer_name_alias",
    header: "Alias",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {row.original.customer_name_alias || "—"}
      </span>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.email || "—"}</span>
    ),
  },
  {
    accessorKey: "phone_number",
    header: "No. Telepon",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.phone_number || "—"}
      </span>
    ),
  },
  {
    accessorKey: "city",
    header: "Kota/Provinsi",
    cell: ({ row }) => {
      const city = row.original.city;
      const prov = row.original.province;
      if (city && prov)
        return (
          <span>
            {city}, {prov}
          </span>
        );
      return <span>{city || prov || "—"}</span>;
    },
  },
];

// Columns that are never shown — they are system internals or covered by
// composite pinned columns (e.g. province is part of the city/province cell).
const EXCLUDED_COLUMNS = ["client_id", "deleted_at", "province"];

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ClientPage() {
  const { data: allClients, loading, error, refetch } = useClients();
  const createMutation = useCreateClientMutation();
  const updateMutation = useUpdateClientMutation();

  // ── Dynamic Schema ─────────────────────────────────────────────────────────
  // Fetches real column list from Supabase information_schema at runtime.
  // Any new column added to the `clients` table will automatically appear
  // in the Columns dropdown on next page load (no code change needed).
  const { columns: schemaColumns } = useTableSchema("clients");

  // Merge: pinned columns (custom renderers) + any extra DB columns not pinned.
  const columns = React.useMemo(
    () => mergeDynamicColumns<ClientRowWithId>(PINNED_COLUMNS, schemaColumns, EXCLUDED_COLUMNS),
    [schemaColumns],
  );

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<ClientRow | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [fields, setFields] = React.useState<ClientInsert>(emptyFields());

  function setField<K extends keyof ClientInsert>(
    key: K,
    value: ClientInsert[K],
  ) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function openForAdd() {
    setEditTarget(null);
    setFields(emptyFields());
    setDrawerOpen(true);
  }

  function openForEdit(client: ClientRow) {
    setEditTarget(client);
    setFields({
      client_code: client.client_code,
      customer_name: client.customer_name,
      email: client.email ?? "",
      phone_number: client.phone_number ?? "",
      whatsapp_number: client.whatsapp_number ?? "",
      address: client.address ?? "",
      city: client.city ?? "",
      province: client.province ?? "",
      postal_code: client.postal_code ?? "",
      notes: client.notes ?? "",
    });
    setDrawerOpen(true);
  }

  async function handleSubmit() {
    if (!fields.client_code.trim() || !fields.customer_name.trim()) {
      toast.error("Kode klien dan nama pelanggan wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      const clientData: ClientInsert = {
        client_code: fields.client_code.trim(),
        customer_name: fields.customer_name.trim(),
        email: fields.email?.trim() || null,
        phone_number: fields.phone_number?.trim() || null,
        whatsapp_number: fields.whatsapp_number?.trim() || null,
        address: fields.address?.trim() || null,
        city: fields.city?.trim() || null,
        province: fields.province?.trim() || null,
        postal_code: fields.postal_code?.trim() || null,
        notes: fields.notes?.trim() || null,
      };

      if (editTarget) {
        await updateMutation.mutateAsync({
          client_id: editTarget.client_id,
          data: clientData,
        });
        toast.success("Klien berhasil diperbarui");
      } else {
        await createMutation.mutateAsync(clientData);
        toast.success("Klien berhasil ditambahkan");
      }

      setDrawerOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ... (metrics etc)

  // ... (FormFields)

  // Drawer Title:
  // title={editTarget ? editTarget.customer_name : "Tambah Klien Baru"}

  // Form Fields:
  // <Label htmlFor="customer_name">Nama Pelanggan *</Label>
  // <Input id="customer_name" value={fields.customer_name} onChange={(e) => setField("customer_name", e.target.value)} ... />

  const metrics: MetricCardItem[] = [
    {
      label: "Total Klien Terdaftar",
      value: allClients.length.toLocaleString("id-ID"),
      delta: "+0%",
      trend: "up",
      summary: "Semua akun klien",
      description: "Jumlah total relasi klien aktif",
      icon: UsersIcon,
    },
  ];

  const mappedClients = allClients.map((c) => ({
    id: c.client_id,
    ...c,
  }));

  const FormFields = (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Identitas Klien
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="client_code">Kode Klien *</Label>
          <Input
            id="client_code"
            value={fields.client_code}
            onChange={(e) => setField("client_code", e.target.value)}
            placeholder="CLI-..."
            disabled={!!editTarget}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="customer_name">Nama Pelanggan *</Label>
          <Input
            id="customer_name"
            value={fields.customer_name}
            onChange={(e) => setField("customer_name", e.target.value)}
            placeholder="Nama lengkap pelanggan"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1 pt-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Informasi Kontak
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={fields.email ?? ""}
          onChange={(e) => setField("email", e.target.value)}
          placeholder="alamat@email.com"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone_number">No. Telepon</Label>
          <Input
            id="phone_number"
            value={fields.phone_number ?? ""}
            onChange={(e) => setField("phone_number", e.target.value)}
            placeholder="08..."
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="whatsapp_number">No. WhatsApp</Label>
          <Input
            id="whatsapp_number"
            value={fields.whatsapp_number ?? ""}
            onChange={(e) => setField("whatsapp_number", e.target.value)}
            placeholder="08..."
          />
        </div>
      </div>

      <div className="flex flex-col gap-1 pt-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Alamat & Lokasi
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="address">Alamat Lengkap</Label>
        <Input
          id="address"
          value={fields.address ?? ""}
          onChange={(e) => setField("address", e.target.value)}
          placeholder="Jalan, No. Rumah, RT/RW..."
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city">Kota</Label>
          <Input
            id="city"
            value={fields.city ?? ""}
            onChange={(e) => setField("city", e.target.value)}
            placeholder="Jakarta"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="province">Provinsi</Label>
          <Input
            id="province"
            value={fields.province ?? ""}
            onChange={(e) => setField("province", e.target.value)}
            placeholder="DKI Jakarta"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="postal_code">Kode Pos</Label>
          <Input
            id="postal_code"
            value={fields.postal_code ?? ""}
            onChange={(e) => setField("postal_code", e.target.value)}
            placeholder="12345"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1 pt-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Lain-lain
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Catatan Keterangan</Label>
        <Input
          id="notes"
          value={fields.notes ?? ""}
          onChange={(e) => setField("notes", e.target.value)}
          placeholder="Catatan tambahan mengenai klien..."
        />
      </div>
    </div>
  );

  if (loading) {
    return (
      <PageContent
        description="Memuat daftar klien dari database..."
        eyebrow="Relationships"
        title="Client"
      >
        <div className="px-4 lg:px-6 space-y-6">
          <div className="h-40 rounded-lg bg-muted animate-pulse" />
        </div>
      </PageContent>
    );
  }

  if (error) {
    return (
      <PageContent
        description="Gagal memuat daftar klien."
        eyebrow="Relationships"
        title="Client"
      >
        <div className="px-4 lg:px-6 py-10 text-center text-destructive">
          Error: {error}
        </div>
      </PageContent>
    );
  }

  return (
    <PageContent
      description="Daftar lengkap akun klien dan informasi detail relasi kontak."
      eyebrow="Relationships"
      title="Client"
    >
      <MetricCards items={metrics} />

      <TableDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editTarget ? editTarget.customer_name : "Tambah Klien Baru"}
        subtitle={editTarget ? `Kode: ${editTarget.client_code}` : undefined}
        sessionId="client-drawer-session"
        onSubmit={handleSubmit}
        onDraft={() => { }}
        showImages={false}
        isSubmitting={isSubmitting}
        isEditMode={!!editTarget}
      >
        {FormFields}
      </TableDrawer>

      <div className="grid grid-cols-1 gap-4">
        <DataTable
          addButtonLabel="Tambah"
          columns={columns}
          data={mappedClients}
          onAddClick={openForAdd}
          onRowClick={(row) => openForEdit(row)}
          defaultTab="all"
          tabs={[
            { value: "all", label: "Semua Klien", badge: mappedClients.length },
          ]}
        />
      </div>
    </PageContent>
  );
}
