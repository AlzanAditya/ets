import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { UsersIcon } from "lucide-react"
import { toast } from "sonner"

import { useClients, useCreateClientMutation, useUpdateClientMutation } from "@/hooks/use-clients"
import { DataTable, type DataTableRow } from "@/components/data-table"
import { TableDrawer } from "@/components/table-drawer"
import { MetricCards } from "@/components/metric-cards"
import { PageContent } from "@/components/page-content"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { MetricCardItem } from "@/types/metrics"
import type { ClientRow, ClientInsert } from "@/types/database"

// ─── Default Empty Fields ──────────────────────────────────────────────────────

function emptyFields(): ClientInsert {
  return {
    client_code: '',
    client_name: '',
    company_name: '',
    email: '',
    phone_number: '',
    whatsapp_number: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    notes: '',
  }
}

// ─── Columns Definition ────────────────────────────────────────────────────────

const columns: ColumnDef<ClientRow & DataTableRow>[] = [
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
    accessorKey: "client_name",
    header: "Nama Klien",
    cell: ({ row }) => <span className="font-medium">{row.original.client_name}</span>,
  },
  {
    accessorKey: "company_name",
    header: "Perusahaan / Instansi",
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.company_name || "—"}</span>,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.email || "—"}</span>,
  },
  {
    accessorKey: "phone_number",
    header: "No. Telepon",
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.phone_number || "—"}</span>,
  },
  {
    accessorKey: "city",
    header: "Kota/Provinsi",
    cell: ({ row }) => {
      const city = row.original.city
      const prov = row.original.province
      if (city && prov) return <span>{city}, {prov}</span>
      return <span>{city || prov || "—"}</span>
    }
  }
]

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ClientPage() {
  const { data: allClients, loading, error, refetch } = useClients()
  const createMutation = useCreateClientMutation()
  const updateMutation = useUpdateClientMutation()

  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<ClientRow | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const [fields, setFields] = React.useState<ClientInsert>(emptyFields())

  function setField<K extends keyof ClientInsert>(key: K, value: ClientInsert[K]) {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  function openForAdd() {
    setEditTarget(null)
    setFields(emptyFields())
    setDrawerOpen(true)
  }

  function openForEdit(client: ClientRow) {
    setEditTarget(client)
    setFields({
      client_code: client.client_code,
      client_name: client.client_name,
      company_name: client.company_name ?? '',
      email: client.email ?? '',
      phone_number: client.phone_number ?? '',
      whatsapp_number: client.whatsapp_number ?? '',
      address: client.address ?? '',
      city: client.city ?? '',
      province: client.province ?? '',
      postal_code: client.postal_code ?? '',
      notes: client.notes ?? '',
    })
    setDrawerOpen(true)
  }

  async function handleSubmit() {
    if (!fields.client_code.trim() || !fields.client_name.trim()) {
      toast.error("Kode klien dan nama klien wajib diisi")
      return
    }

    setIsSubmitting(true)
    try {
      const clientData: ClientInsert = {
        client_code: fields.client_code.trim(),
        client_name: fields.client_name.trim(),
        company_name: fields.company_name?.trim() || null,
        email: fields.email?.trim() || null,
        phone_number: fields.phone_number?.trim() || null,
        whatsapp_number: fields.whatsapp_number?.trim() || null,
        address: fields.address?.trim() || null,
        city: fields.city?.trim() || null,
        province: fields.province?.trim() || null,
        postal_code: fields.postal_code?.trim() || null,
        notes: fields.notes?.trim() || null,
      }

      if (editTarget) {
        await updateMutation.mutateAsync({
          client_id: editTarget.client_id,
          data: clientData,
        })
        toast.success("Klien berhasil diperbarui")
      } else {
        await createMutation.mutateAsync(clientData)
        toast.success("Klien berhasil ditambahkan")
      }

      setDrawerOpen(false)
      refetch()
    } catch (err: any) {
      toast.error(err?.message ?? "Terjadi kesalahan")
    } finally {
      setIsSubmitting(false)
    }
  }

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
  ]

  const mappedClients = allClients.map((c) => ({
    id: c.client_id,
    ...c,
  }))

  const FormFields = (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Identitas Klien</p>
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
          <Label htmlFor="client_name">Nama Klien *</Label>
          <Input
            id="client_name"
            value={fields.client_name}
            onChange={(e) => setField("client_name", e.target.value)}
            placeholder="Nama lengkap/Kontak klien"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="company_name">Nama Perusahaan / Instansi</Label>
        <Input
          id="company_name"
          value={fields.company_name ?? ''}
          onChange={(e) => setField("company_name", e.target.value)}
          placeholder="PT ... atau CV ..."
        />
      </div>

      <div className="flex flex-col gap-1 pt-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Informasi Kontak</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={fields.email ?? ''}
          onChange={(e) => setField("email", e.target.value)}
          placeholder="alamat@email.com"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone_number">No. Telepon</Label>
          <Input
            id="phone_number"
            value={fields.phone_number ?? ''}
            onChange={(e) => setField("phone_number", e.target.value)}
            placeholder="08..."
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="whatsapp_number">No. WhatsApp</Label>
          <Input
            id="whatsapp_number"
            value={fields.whatsapp_number ?? ''}
            onChange={(e) => setField("whatsapp_number", e.target.value)}
            placeholder="08..."
          />
        </div>
      </div>

      <div className="flex flex-col gap-1 pt-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Alamat & Lokasi</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="address">Alamat Lengkap</Label>
        <Input
          id="address"
          value={fields.address ?? ''}
          onChange={(e) => setField("address", e.target.value)}
          placeholder="Jalan, No. Rumah, RT/RW..."
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city">Kota</Label>
          <Input
            id="city"
            value={fields.city ?? ''}
            onChange={(e) => setField("city", e.target.value)}
            placeholder="Jakarta"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="province">Provinsi</Label>
          <Input
            id="province"
            value={fields.province ?? ''}
            onChange={(e) => setField("province", e.target.value)}
            placeholder="DKI Jakarta"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="postal_code">Kode Pos</Label>
          <Input
            id="postal_code"
            value={fields.postal_code ?? ''}
            onChange={(e) => setField("postal_code", e.target.value)}
            placeholder="12345"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1 pt-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lain-lain</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Catatan Keterangan</Label>
        <Input
          id="notes"
          value={fields.notes ?? ''}
          onChange={(e) => setField("notes", e.target.value)}
          placeholder="Catatan tambahan mengenai klien..."
        />
      </div>
    </div>
  )

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
    )
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
    )
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
        title={editTarget ? editTarget.client_name : "Tambah Klien Baru"}
        subtitle={editTarget ? `Kode: ${editTarget.client_code}` : undefined}
        sessionId="client-drawer-session"
        onSubmit={handleSubmit}
        onDraft={() => {}}
        showImages={false}
        isSubmitting={isSubmitting}
        isEditMode={!!editTarget}
      >
        {FormFields}
      </TableDrawer>

      <div className="grid grid-cols-1 gap-4">
        <DataTable
          addButtonLabel="Tambah Klien"
          columns={columns as any}
          data={mappedClients}
          onAddClick={openForAdd}
          onRowClick={(row) => openForEdit(row as any)}
          defaultTab="all"
          tabs={[
            { value: "all", label: "Semua Klien", badge: mappedClients.length },
          ]}
        />
      </div>
    </PageContent>
  )
}
