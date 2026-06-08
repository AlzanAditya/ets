import type { ColumnDef } from "@tanstack/react-table"
import { Wallet2Icon, CheckCircle2Icon, ClipboardIcon, ArrowRightLeftIcon, ArrowRightIcon } from "lucide-react"
import { useTransactions, useTransactionStats, useTransactionTrend } from "@/hooks/use-transactions"
import { TableSkeleton } from "@/components/table-skeleton"
import { ErrorState } from "@/components/error-state"
import { EmptyState } from "@/components/empty-state"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable, type DataTableRow } from "@/components/data-table"
import { MetricCards } from "@/components/metric-cards"
import { PageContent } from "@/components/page-content"
import { Badge } from "@/components/ui/badge"
import type { InteractiveAreaChartConfig } from "@/types/charts"
import type { MetricCardItem } from "@/types/metrics"
import type { TransactionWithRelations } from "@/services/transactions.service"

interface TransactionRowWithId extends DataTableRow, TransactionWithRelations {}

function formatIDR(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const columns: ColumnDef<TransactionRowWithId>[] = [
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
        sale: "Penjualan",
        purchase: "Pembelian",
        return: "Retur",
        transfer: "Mutasi",
      }
      const typeVariants: Record<string, "default" | "secondary" | "outline"> = {
        sale: "default",
        purchase: "secondary",
        return: "outline",
        transfer: "outline",
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
      const clientName = client?.client_name ?? "Klien"
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
        draft: "Draft",
        pending: "Pending",
        completed: "Selesai",
        cancelled: "Batal",
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
          {date.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      )
    },
  },
]

export default function TransactionPage() {
  const { data: txns, loading: loadingTxns, error: errorTxns, refetch: refetchTxns } = useTransactions()
  const { stats, loading: loadingStats, error: errorStats } = useTransactionStats()
  const { data: trend, loading: loadingTrend, error: errorTrend } = useTransactionTrend(30)

  const isLoading = loadingTxns || loadingStats || loadingTrend
  const hasError = errorTxns || errorStats || errorTrend

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
      delta: "+0%",
      trend: "up",
      summary: "Membutuhkan persetujuan",
      description: "Menunggu verifikasi admin",
      icon: Wallet2Icon,
    },
    {
      label: "Selesai",
      value: (stats?.completed_count ?? 0).toString(),
      delta: "+0%",
      trend: "up",
      summary: "Berhasil diverifikasi",
      description: "Mutasi produk terbukukan",
      icon: CheckCircle2Icon,
    },
    {
      label: "Draft",
      value: (stats?.draft_count ?? 0).toString(),
      delta: "+0%",
      trend: "up",
      summary: "Transaksi dalam penyusunan",
      description: "Belum disubmit",
      icon: ClipboardIcon,
    },
    {
      label: "Volume Transaksi",
      value: formatIDR(stats?.total_revenue ?? 0),
      delta: "+0%",
      trend: "up",
      summary: "Akumulasi total nilai",
      description: "Dari status selesai",
      icon: Wallet2Icon,
    },
  ]

  // Map daily transaction trend data
  const today = new Date().toISOString().split("T")[0]
  const chartData = trend.map((t) => ({
    date: t.date,
    desktop: t.revenue, // Desktop -> Revenue
    mobile: t.count,     // Mobile -> Count
  }))

  const chartConfig: InteractiveAreaChartConfig = {
    title: "Aktivitas Transaksi",
    description: "Tren nilai transaksi disetujui (dalam IDR) dan frekuensi transaksi harian",
    compactDescription: "Tren Transaksi",
    data: chartData,
    chartConfig: {
      desktop: { label: "Revenue (IDR)", color: "hsl(var(--primary))" },
      mobile: { label: "Jumlah Transaksi", color: "hsl(var(--chart-2))" },
    },
    ranges: [
      { value: "30d", label: "30 Hari Terakhir", days: 30 },
      { value: "7d", label: "7 Hari Terakhir", days: 7 },
    ],
    defaultRange: "30d",
    mobileRange: "7d",
    referenceDate: today,
  }

  // Format data for DataTable
  const mappedAll: TransactionRowWithId[] = txns.map((t) => ({
    id: t.transaction_id,
    ...t,
  }))

  const mappedPending = mappedAll.filter((t) => t.status === "pending")
  const mappedCompleted = mappedAll.filter((t) => t.status === "completed" || t.status === "cancelled")
  const mappedDraft = mappedAll.filter((t) => t.status === "draft")

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

      {txns.length === 0 ? (
        <div className="px-4 lg:px-6">
          <EmptyState
            title="Belum Ada Transaksi"
            description="Tidak ada catatan transaksi terdaftar di database."
            actionLabel="Buat Transaksi Baru"
            onAction={() => alert("Form buat transaksi akan segera tersedia.")}
          />
        </div>
      ) : (
        <DataTable
          addButtonLabel="Transaksi Baru"
          columns={columns}
          data={mappedAll}
          defaultTab="all"
          tabs={[
            {
              value: "all",
              label: "Semua Transaksi",
              badge: mappedAll.length,
              content: (
                <DataTable
                  addButtonLabel="Transaksi Baru"
                  columns={columns}
                  data={mappedAll}
                  defaultTab="all"
                />
              ),
            },
            {
              value: "pending",
              label: "Antrean Persetujuan",
              badge: mappedPending.length,
              content: (
                <DataTable
                  addButtonLabel="Transaksi Baru"
                  columns={columns}
                  data={mappedPending}
                  defaultTab="pending"
                />
              ),
            },
            {
              value: "completed",
              label: "Riwayat Selesai",
              badge: mappedCompleted.length,
              content: (
                <DataTable
                  addButtonLabel="Transaksi Baru"
                  columns={columns}
                  data={mappedCompleted}
                  defaultTab="completed"
                />
              ),
            },
            {
              value: "draft",
              label: "Draft",
              badge: mappedDraft.length,
              content: (
                <DataTable
                  addButtonLabel="Transaksi Baru"
                  columns={columns}
                  data={mappedDraft}
                  defaultTab="draft"
                />
              ),
            },
          ]}
        />
      )}
    </PageContent>
  )
}
