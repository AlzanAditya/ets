import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import {
  Wallet2Icon, CheckCircle2Icon, ClipboardIcon,
  ArrowRightLeftIcon, ArrowRightIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  useTransactions,
  useTransactionStats,
  useTransactionTrend,
  useCreateTransactionMutation,
} from "@/hooks/use-transactions"
import { useBranches } from "@/hooks/use-branches"
import { useClients } from "@/hooks/use-clients"
import { useTableSchema } from "@/hooks/use-table-schema"
import { mergeDynamicColumns } from "@/lib/dynamic-columns"
import { safeUUID } from "@/lib/utils"
import { TableSkeleton } from "@/components/table-skeleton"
import { ErrorState } from "@/components/error-state"
import { EmptyState } from "@/components/empty-state"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable, type DataTableRow } from "@/components/data-table"
import { TableDrawer } from "@/components/table-drawer"
import { MetricCards } from "@/components/metric-cards"
import { PageContent } from "@/components/page-content"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { InteractiveAreaChartConfig } from "@/types/charts"
import type { MetricCardItem } from "@/types/metrics"
import type { TransactionWithRelations } from "@/services/transactions.service"
import type { TransactionType, TransactionStatus } from "@/types/database"

const NO_SELECTION_VALUE = "__none__"

// ─── Types ────────────────────────────────────────────────────────────────────

interface TransactionRowWithId extends DataTableRow, TransactionWithRelations { }

interface TransactionFormFields {
  transaction_type: TransactionType
  transaction_date: string
  client_id: string
  source_branch_id: string
  destination_branch_id: string
  notes: string
  subtotal: string
  discount_amount: string
  tax_amount: string
  shipping_cost: string
  grand_total: string
  status: TransactionStatus
}

function emptyTxnFields(): TransactionFormFields {
  return {
    transaction_type: 'sale',
    transaction_date: new Date().toISOString().split('T')[0],
    client_id: '',
    source_branch_id: '',
    destination_branch_id: '',
    notes: '',
    subtotal: '0',
    discount_amount: '0',
    tax_amount: '0',
    shipping_cost: '0',
    grand_total: '0',
    status: 'draft',
  }
}

function fromTransaction(t: TransactionWithRelations): TransactionFormFields {
  return {
    transaction_type: t.transaction_type,
    transaction_date: t.transaction_date,
    client_id: t.client_id ?? '',
    source_branch_id: t.source_branch_id ?? '',
    destination_branch_id: t.destination_branch_id ?? '',
    notes: t.notes ?? '',
    subtotal: String(t.subtotal),
    discount_amount: String(t.discount_amount),
    tax_amount: String(t.tax_amount),
    shipping_cost: String(t.shipping_cost),
    grand_total: String(t.grand_total),
    status: t.status,
  }
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatIDR(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// ─── Columns ──────────────────────────────────────────────────────────────────

// ─── Pinned Columns (rich renderers — always shown first) ─────────────────────
const PINNED_COLUMNS: ColumnDef<TransactionRowWithId>[] = [
  {
    accessorKey: "transaction_code",
    header: "Kode Transaksi",
    cell: ({ row }) => (
      <span className="font-mono text-sm font-semibold text-foreground">
        {row.original.transaction_code}
      </span>
    ),
  },
  {
    accessorKey: "transaction_type",
    header: "Tipe",
    cell: ({ row }) => {
      const typeLabels: Record<string, string> = {
        sale: "Penjualan", purchase: "Pembelian", return: "Retur", transfer: "Mutasi",
      }
      const typeVariants: Record<string, "default" | "secondary" | "outline"> = {
        sale: "default", purchase: "secondary", return: "outline", transfer: "outline",
      }
      return (
        <Badge variant={typeVariants[row.original.transaction_type] ?? "outline"}>
          {typeLabels[row.original.transaction_type] ?? row.original.transaction_type}
        </Badge>
      )
    },
  },
  {
    id: "route",
    header: "Asal / Tujuan",
    cell: ({ row }) => {
      const { transaction_type, client, source_branch, destination_branch } = row.original
      const clientName = client?.customer_name ?? "Klien"
      const srcName = source_branch?.branch_name ?? "Gudang Asal"
      const destName = destination_branch?.branch_name ?? "Gudang Tujuan"

      if (transaction_type === "sale") {
        return (
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">{srcName}</span>
            <ArrowRightIcon className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{clientName}</span>
          </div>
        )
      }
      if (transaction_type === "purchase") {
        return (
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">Supplier</span>
            <ArrowRightIcon className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{destName}</span>
          </div>
        )
      }
      if (transaction_type === "transfer") {
        return (
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">{srcName}</span>
            <ArrowRightLeftIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{destName}</span>
          </div>
        )
      }
      if (transaction_type === "return") {
        return (
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">{clientName}</span>
            <ArrowRightIcon className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{destName}</span>
          </div>
        )
      }
      return <span className="text-muted-foreground">—</span>
    },
  },
  {
    accessorKey: "grand_total",
    header: () => <div className="text-right">Total Nilai</div>,
    cell: ({ row }) => (
      <div className="text-right font-semibold text-foreground">
        {formatIDR(row.original.grand_total)}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const statusColors: Record<string, string> = {
        draft: "bg-muted text-muted-foreground border-transparent",
        pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        cancelled: "bg-destructive/10 text-destructive border-destructive/20",
      }
      const statusLabels: Record<string, string> = {
        draft: "Draft", pending: "Pending", completed: "Selesai", cancelled: "Batal",
      }
      return (
        <Badge variant="outline" className={statusColors[row.original.status] ?? ""}>
          {statusLabels[row.original.status] ?? row.original.status}
        </Badge>
      )
    },
  },
  {
    accessorKey: "transaction_date",
    header: "Tanggal",
    cell: ({ row }) => {
      const date = new Date(row.original.transaction_date)
      return (
        <span className="text-muted-foreground text-sm">
          {date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      )
    },
  },
]

// FK UUID columns, relations (joined objects), and internal columns to exclude from auto-gen.
const EXCLUDED_TX_COLUMNS = [
  "transaction_id",  // PK UUID
  "client_id",       // FK — shown via "route" column with joined name
  "source_branch_id",       // FK
  "destination_branch_id",  // FK
  "created_by",      // FK — admin UUID
  "approved_by",     // FK — admin UUID
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TransactionPage() {
  const { data: txns, loading: loadingTxns, error: errorTxns, refetch: refetchTxns } = useTransactions()
  const { stats, loading: loadingStats, error: errorStats } = useTransactionStats()
  const { data: trend, loading: loadingTrend, error: errorTrend } = useTransactionTrend(30)
  const { data: branches } = useBranches()
  const { data: clients } = useClients()
  const createMutation = useCreateTransactionMutation()

  const isLoading = loadingTxns || loadingStats || loadingTrend
  const hasError = errorTxns || errorStats || errorTrend

  // ── Dynamic Schema ──────────────────────────────────────────────────────────
  // Fetches real column list from Supabase information_schema at runtime.
  // Any new column added to the `transactions` table will automatically appear
  // in the Columns dropdown without code changes.
  const { columns: schemaColumns } = useTableSchema("transactions")
  const columns = React.useMemo(
    () => mergeDynamicColumns<TransactionRowWithId>(PINNED_COLUMNS, schemaColumns, EXCLUDED_TX_COLUMNS),
    [schemaColumns],
  )

  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<TransactionWithRelations | null>(null)
  const [activeTab, setActiveTab] = React.useState("all")
  const sessionId = React.useMemo(() => safeUUID(), [])
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  const [fields, setFields] = React.useState<TransactionFormFields>(emptyTxnFields())
  function setField<K extends keyof TransactionFormFields>(key: K, value: TransactionFormFields[K]) {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  function openForEdit(txn: TransactionWithRelations) {
    setEditTarget(txn)
    setFields(fromTransaction(txn))
    setDrawerOpen(true)
  }

  function openForAdd() {
    setEditTarget(null)
    setFields(emptyTxnFields())
    setDrawerOpen(true)
  }

  // ── Submit ────────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setIsSubmitting(true)
    try {
      if (editTarget) {
        toast.info("Edit transaksi belum diimplementasi di sini.")
      } else {
        await createMutation.mutateAsync({
          transaction_type: fields.transaction_type,
          transaction_date: fields.transaction_date,
          client_id: fields.client_id || null,
          source_branch_id: fields.source_branch_id || null,
          destination_branch_id: fields.destination_branch_id || null,
          notes: fields.notes || null,
          subtotal: Number(fields.subtotal),
          discount_amount: Number(fields.discount_amount),
          tax_amount: Number(fields.tax_amount),
          shipping_cost: Number(fields.shipping_cost),
          grand_total: Number(fields.grand_total),
          status: 'pending',
          created_by: null,
        })
        toast.success("Transaksi berhasil dibuat dan disubmit")
      }
      setDrawerOpen(false)
      refetchTxns()
    } catch (err: any) {
      toast.error(err?.message ?? "Terjadi kesalahan")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Draft ─────────────────────────────────────────────────────────────────────
  async function handleDraft() {
    setIsSaving(true)
    try {
      await createMutation.mutateAsync({
        transaction_type: fields.transaction_type,
        transaction_date: fields.transaction_date,
        client_id: fields.client_id || null,
        source_branch_id: fields.source_branch_id || null,
        destination_branch_id: fields.destination_branch_id || null,
        notes: fields.notes || null,
        subtotal: Number(fields.subtotal),
        discount_amount: Number(fields.discount_amount),
        tax_amount: Number(fields.tax_amount),
        shipping_cost: Number(fields.shipping_cost),
        grand_total: Number(fields.grand_total),
        status: 'draft',
        created_by: null,
      })
      toast.success("Transaksi disimpan sebagai draft")
      setDrawerOpen(false)
      refetchTxns()
    } catch (err: any) {
      toast.error(err?.message ?? "Gagal menyimpan draft")
    } finally {
      setIsSaving(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <PageContent
        description="Memuat antrean dan riwayat transaksi dari database..."
        eyebrow="Operations"
        title="Transaction"
      >
        <div className="px-4 lg:px-6 space-y-6">
          <TableSkeleton columnCount={6} rowCount={8} />
        </div>
      </PageContent>
    )
  }

  if (hasError) {
    return (
      <PageContent
        description="Gagal memuat modul transaksi."
        eyebrow="Operations"
        title="Transaction"
      >
        <div className="px-4 lg:px-6">
          <ErrorState message={errorTxns || errorStats || errorTrend} onRetry={refetchTxns} />
        </div>
      </PageContent>
    )
  }

  const metrics: MetricCardItem[] = [
    {
      label: "Antrean (Pending)",
      value: (stats?.pending_count ?? 0).toString(),
      delta: "+0%", trend: "up",
      summary: "Membutuhkan persetujuan",
      description: "Menunggu verifikasi admin",
      icon: Wallet2Icon,
    },
    {
      label: "Selesai",
      value: (stats?.completed_count ?? 0).toString(),
      delta: "+0%", trend: "up",
      summary: "Berhasil diverifikasi",
      description: "Mutasi produk terbukukan",
      icon: CheckCircle2Icon,
    },
    {
      label: "Draft",
      value: (stats?.draft_count ?? 0).toString(),
      delta: "+0%", trend: "up",
      summary: "Transaksi dalam penyusunan",
      description: "Belum disubmit",
      icon: ClipboardIcon,
    },
    {
      label: "Volume Transaksi",
      value: formatIDR(stats?.total_revenue ?? 0),
      delta: "+0%", trend: "up",
      summary: "Akumulasi total nilai",
      description: "Dari status selesai",
      icon: Wallet2Icon,
    },
  ]

  const today = new Date().toISOString().split("T")[0]
  const chartData = trend.map((t) => ({
    date: t.date,
    desktop: t.revenue,
    mobile: t.count,
  }))
  const chartConfig: InteractiveAreaChartConfig = {
    title: "Aktivitas Transaksi",
    description: "Tren nilai transaksi disetujui (dalam IDR) dan frekuensi transaksi harian",
    compactDescription: "Tren Transaksi",
    data: chartData,
    chartConfig: {
      desktop: { label: "Revenue (IDR)", color: "var(--primary)" },
      mobile: { label: "Jumlah Transaksi", color: "var(--primary)" },
    },
    ranges: [
      { value: "30d", label: "30 Hari", days: 30 },
      { value: "7d", label: "7 Hari", days: 7 },
    ],
    defaultRange: "30d",
    mobileRange: "7d",
    referenceDate: today,
  }

  const mappedAll = txns.map((t) => ({ id: t.transaction_id, ...t }))
  const mappedPending = mappedAll.filter((t) => t.status === "pending")
  const mappedCompleted = mappedAll.filter((t) => t.status === "completed" || t.status === "cancelled")
  const mappedDraft = mappedAll.filter((t) => t.status === "draft")

  // NOTE: plain variable — no useMemo here because this runs after early returns
  // (useMemo after conditional returns violates Rules of Hooks)
  const filteredTxns =
    activeTab === "pending" ? mappedPending
      : activeTab === "completed" ? mappedCompleted
        : activeTab === "draft" ? mappedDraft
          : mappedAll

  // ─── Transaction Form Fields ───────────────────────────────────────────────────
  const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
    { value: 'sale', label: 'Penjualan' },
    { value: 'purchase', label: 'Pembelian' },
    { value: 'return', label: 'Retur' },
    { value: 'transfer', label: 'Mutasi/Transfer' },
  ]

  const FormFields = (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Detail Transaksi</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="transaction_type">Tipe Transaksi</Label>
          <Select value={fields.transaction_type} onValueChange={(v) => setField("transaction_type", v as TransactionType)}>
            <SelectTrigger id="transaction_type" className="w-full">
              <SelectValue placeholder="Pilih tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="transaction_date">Tanggal Transaksi</Label>
          <Input id="transaction_date" type="date" value={fields.transaction_date} onChange={(e) => setField("transaction_date", e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="client_id">Klien</Label>
        <Select
          value={fields.client_id || NO_SELECTION_VALUE}
          onValueChange={(v) => setField("client_id", v === NO_SELECTION_VALUE ? "" : v)}
        >
          <SelectTrigger id="client_id" className="w-full">
            <SelectValue placeholder="Pilih klien" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={NO_SELECTION_VALUE}>— Tidak ada —</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.client_id} value={c.client_id}>{c.customer_name}</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="source_branch_id">Cabang Asal</Label>
          <Select
            value={fields.source_branch_id || NO_SELECTION_VALUE}
            onValueChange={(v) => setField("source_branch_id", v === NO_SELECTION_VALUE ? "" : v)}
          >
            <SelectTrigger id="source_branch_id" className="w-full">
              <SelectValue placeholder="Pilih cabang" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={NO_SELECTION_VALUE}>— Tidak ada —</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.branch_id} value={b.branch_id}>{b.branch_name}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="destination_branch_id">Cabang Tujuan</Label>
          <Select
            value={fields.destination_branch_id || NO_SELECTION_VALUE}
            onValueChange={(v) => setField("destination_branch_id", v === NO_SELECTION_VALUE ? "" : v)}
          >
            <SelectTrigger id="destination_branch_id" className="w-full">
              <SelectValue placeholder="Pilih cabang" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={NO_SELECTION_VALUE}>— Tidak ada —</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.branch_id} value={b.branch_id}>{b.branch_name}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1 pt-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nilai Transaksi</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="subtotal">Subtotal (Rp)</Label>
          <Input id="subtotal" type="number" min="0" value={fields.subtotal} onChange={(e) => setField("subtotal", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="discount_amount">Diskon (Rp)</Label>
          <Input id="discount_amount" type="number" min="0" value={fields.discount_amount} onChange={(e) => setField("discount_amount", e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tax_amount">Pajak (Rp)</Label>
          <Input id="tax_amount" type="number" min="0" value={fields.tax_amount} onChange={(e) => setField("tax_amount", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="shipping_cost">Ongkir (Rp)</Label>
          <Input id="shipping_cost" type="number" min="0" value={fields.shipping_cost} onChange={(e) => setField("shipping_cost", e.target.value)} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="grand_total">Grand Total (Rp)</Label>
        <Input id="grand_total" type="number" min="0" value={fields.grand_total} onChange={(e) => setField("grand_total", e.target.value)} className="font-semibold" />
      </div>

      <div className="flex flex-col gap-1 pt-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Catatan</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Catatan Transaksi</Label>
        <Input id="notes" value={fields.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Informasi tambahan..." />
      </div>

      {editTarget && (
        <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Kode Transaksi</span>
            <span className="font-mono font-semibold text-foreground">{editTarget.transaction_code}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Dibuat</span>
            <span>{new Date(editTarget.created_at).toLocaleDateString("id-ID")}</span>
          </div>
          {editTarget.approved_at && (
            <div className="flex justify-between mt-1">
              <span>Disetujui</span>
              <span>{new Date(editTarget.approved_at).toLocaleDateString("id-ID")}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <PageContent
      description="Ruang kerja untuk melacak antrean mutasi barang, penjualan, pembelian, retur, dan persetujuan."
      eyebrow="Operations"
      title="Transaction"
    >
      <MetricCards items={metrics} />

      <div className="px-4 lg:px-6">
        <ChartAreaInteractive config={chartConfig} />
      </div>

      {/* ── Table Drawer ──────────────────────────────────────────────────────── */}
      <TableDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editTarget ? `Transaksi ${editTarget.transaction_code}` : "Transaksi Baru"}
        subtitle={editTarget ? `${editTarget.transaction_type} · ${editTarget.status}` : undefined}
        sessionId={sessionId}
        onSubmit={handleSubmit}
        onDraft={handleDraft}
        showImages={false}
        isSubmitting={isSubmitting}
        isSaving={isSaving}
        isEditMode={!!editTarget}
      >
        {FormFields}
      </TableDrawer>

      {txns.length === 0 ? (
        <div className="px-4 lg:px-6">
          <EmptyState
            title="Belum Ada Transaksi"
            description="Tidak ada catatan transaksi terdaftar di database."
            actionLabel="Buat Transaksi Baru"
            onAction={openForAdd}
          />
        </div>
      ) : (
        <DataTable
          addButtonLabel="Transaksi Baru"
          columns={columns}
          data={filteredTxns}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onAddClick={openForAdd}
          onRowClick={(row) => openForEdit(row)}
          tabs={[
            {
              value: "all",
              label: "Semua Transaksi",
              badge: mappedAll.length,
            },
            {
              value: "pending",
              label: "Antrean Persetujuan",
              badge: mappedPending.length,
            },
            {
              value: "completed",
              label: "Riwayat Selesai",
              badge: mappedCompleted.length,
            },
            {
              value: "draft",
              label: "Draft",
              badge: mappedDraft.length,
            },
          ]}
        />
      )}
    </PageContent>
  )
}
