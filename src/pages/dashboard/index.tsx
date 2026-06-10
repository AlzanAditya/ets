import { useDashboard } from "@/hooks/use-dashboard"
import { DashboardSkeleton } from "@/components/dashboard-skeleton"
import { ErrorState } from "@/components/error-state"
import { MetricCards } from "@/components/metric-cards"
import { PageContent } from "@/components/page-content"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable, type DataTableRow } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import type { MetricCardItem } from "@/types/metrics"
import type { InteractiveAreaChartConfig } from "@/types/charts"
import type { ColumnDef } from "@tanstack/react-table"
import type { TransactionRow } from "@/types/database"
import {
  TrendingUpIcon,
  BarChart3Icon,
  PackageIcon,
  ClipboardListIcon,
  ClockIcon,
} from "lucide-react"

// Helper to format IDR Currency
function formatIDR(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

interface DashboardTransactionRow extends DataTableRow {
  transaction_id: string
  transaction_code: string
  transaction_type: TransactionRow["transaction_type"]
  status: TransactionRow["status"]
  grand_total: number
  transaction_date: string
}

const transactionColumns: ColumnDef<DashboardTransactionRow>[] = [
  {
    accessorKey: "transaction_code",
    header: "Kode Transaksi",
    cell: ({ row }) => (
      <span className="font-mono font-medium">{row.original.transaction_code}</span>
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
    accessorKey: "grand_total",
    header: () => <div className="text-right">Total Nilai</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">{formatIDR(row.original.grand_total)}</div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const statusLabels: Record<string, string> = {
        draft: "Draft",
        pending: "Tertunda",
        completed: "Selesai",
        cancelled: "Dibatalkan",
      }
      const statusColors: Record<string, string> = {
        draft: "bg-muted text-muted-foreground border-transparent",
        pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        cancelled: "bg-destructive/10 text-destructive border-destructive/20",
      }
      return (
        <Badge variant="outline" className={statusColors[row.original.status]}>
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
        <span className="text-muted-foreground">
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

export default function DashboardPage() {
  const { data, loading, error, refetch } = useDashboard(30)

  if (loading) {
    return (
      <PageContent
        actions={null}
        description="Memuat ringkasan performa, aktivitas, dan riwayat aset..."
        eyebrow="Overview"
        title="Dashboard"
      >
        <DashboardSkeleton />
      </PageContent>
    )
  }

  if (error || !data) {
    return (
      <PageContent
        actions={null}
        description="Terjadi kesalahan saat memuat data ringkasan."
        eyebrow="Overview"
        title="Dashboard"
      >
        <div className="px-4 lg:px-6">
          <ErrorState message={error} onRetry={refetch} />
        </div>
      </PageContent>
    )
  }

  // Map database statistics to metric cards
  const metrics: MetricCardItem[] = [
    {
      label: "Total Pendapatan",
      value: formatIDR(data.metrics.totalRevenue),
      delta: data.metrics.revenueTrend.delta,
      trend: data.metrics.revenueTrend.trend,
      summary: "Akumulasi penjualan selesai",
      description: "Dari transaksi disetujui",
      icon: TrendingUpIcon,
    },
    {
      label: "Total QR Scan",
      value: data.metrics.totalScans.toLocaleString("id-ID"),
      delta: `+${data.metrics.scansThisMonth}`,
      trend: "up",
      summary: "Scan bulan ini",
      description: "Interaksi kode QR aktif",
      icon: BarChart3Icon,
    },
    {
      label: "Aset Aktif",
      value: data.metrics.activeAssets.toLocaleString("id-ID"),
      delta: "+0%",
      trend: "up",
      summary: "Ready di gudang",
      description: "Menunggu deployment/sale",
      icon: PackageIcon,
    },
    {
      label: "Total Aset",
      value: data.metrics.totalAssets.toLocaleString("id-ID"),
      delta: "+0%",
      trend: "up",
      summary: "Jumlah katalog terdaftar",
      description: "Excluding retired status",
      icon: ClipboardListIcon,
    },
  ]

  // Configure ChartAreaInteractive to show Revenue (desktop) and QR Scans (mobile)
  const today = new Date().toISOString().split("T")[0]
  const chartConfig: InteractiveAreaChartConfig = {
    title: "Tren Aktivitas Gudang & Scan",
    description: "Analisis perbandingan revenue transaksi selesai dan volume scan QR harian",
    compactDescription: "Tren Aktivitas",
    data: data.chartData,
    chartConfig: {
      desktop: {
        label: "Revenue (IDR)",
        color: "var(--primary)",
      },
      mobile: {
        label: "Volume Scan",
        color: "var(--primary)",
      },
    },
    ranges: [
      { value: "30d", label: "30 Hari Terakhir", days: 30 },
      { value: "7d", label: "7 Hari Terakhir", days: 7 },
    ],
    defaultRange: "30d",
    mobileRange: "7d",
    referenceDate: today,
  }

  // Format recent transactions for DataTable compatibility
  const tableData: DashboardTransactionRow[] = data.recentTransactions.map((t) => ({
    id: t.transaction_id,
    transaction_id: t.transaction_id,
    transaction_code: t.transaction_code,
    transaction_type: t.transaction_type,
    status: t.status,
    grand_total: t.grand_total,
    transaction_date: t.transaction_date,
  }))

  return (
    <PageContent
      actions={null}
      description="Overview module untuk memantau ringkasan performa, aktivitas, dan daftar kerja utama."
      eyebrow="Overview"
      title="Dashboard"
    >
      <MetricCards items={metrics} />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive config={chartConfig} />
      </div>
      <div className="px-4 lg:px-6">
        <div className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-lg">Transaksi Terbaru</h3>
          </div>
          <DataTable
            addButtonLabel="Transaksi Baru"
            columns={transactionColumns}
            data={tableData}
            defaultTab="recent"
            tabs={[{ value: "recent", label: "Transaksi Terbaru" }]}
          />
        </div>
      </div>
    </PageContent>
  )
}
