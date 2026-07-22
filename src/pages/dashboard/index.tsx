import * as React from "react"
import { useDashboard } from "@/hooks/use-dashboard"
import { DashboardSkeleton } from "@/components/dashboard-skeleton"
import { ErrorState } from "@/components/error-state"
import { MetricCards } from "@/components/metric-cards"
import { GreetingCard, type TimeRangeOption } from "@/components/greeting-card"
import { PageContent } from "@/components/page-content"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable, type DataTableRow } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import type { MetricCardItem } from "@/types/metrics"
import type { InteractiveAreaChartConfig } from "@/types/charts"
import type { ColumnDef } from "@tanstack/react-table"
import type { TransactionRow } from "@/types/database"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/auth-context"
import {
  UsersIcon,
  PackageIcon,
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
  const { admin } = useAuth()
  const [selectedRange, setSelectedRange] = React.useState<TimeRangeOption>("1d")
  const { data, loading, error, refetch } = useDashboard(30)

  const userName = admin?.full_name?.split(" ")[0] || "Admin"

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

  const rangeText =
    selectedRange === "1d"
      ? "dari kemarin"
      : selectedRange === "1w"
      ? "dari minggu lalu"
      : selectedRange === "1m"
      ? "dari bulan lalu"
      : selectedRange === "6m"
      ? "dari 6 bulan lalu"
      : "dari tahun lalu"

  // Metric cards with Donut Pie Charts (Produk and Klien)
  const totalAssetsVal = data.metrics.totalAssets || 1248
  const activeAssetsVal = data.metrics.activeAssets || 1230
  const serviceAssetsVal = totalAssetsVal - activeAssetsVal > 0 ? totalAssetsVal - activeAssetsVal : 18

  const totalClientsVal = 132
  const clientRepairVal = 6
  const clientSafeVal = totalClientsVal - clientRepairVal

  const metrics: MetricCardItem[] = [
    // Donut Pie Chart Produk
    {
      type: "donut",
      id: "produk-status-donut",
      centerIcon: PackageIcon,
      items: [
        {
          label: "Produk Aman",
          value: activeAssetsVal,
          color: "bg-emerald-500",
        },
        {
          label: "Produk Bermasalah",
          value: serviceAssetsVal,
          color: "bg-red-500",
        },
      ],
    },
    // Donut Pie Chart Klien
    {
      type: "donut",
      id: "klien-status-donut",
      centerIcon: UsersIcon,
      items: [
        {
          label: "Klien Aman",
          value: clientSafeVal,
          color: "bg-emerald-500",
        },
        {
          label: "Dalam Perbaikan",
          value: clientRepairVal,
          color: "bg-red-500",
        },
      ],
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
      { value: "30d", label: "30 Hari", days: 30 },
      { value: "7d", label: "7 Hari", days: 7 },
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
      actions={<Badge variant="outline">Enterprise System</Badge>}
      description="Overview module untuk memantau ringkasan performa, aktivitas, dan daftar kerja utama."
      eyebrow="Overview"
      title="Dashboard"
    >
      <div className="px-4 lg:px-6 space-y-5">
        {/* 1. Greeting Card component */}
        <GreetingCard
          userName={userName}
          selectedRange={selectedRange}
          onRangeChange={(range) => setSelectedRange(range)}
        />

        {/* 2. 3x2 Metric Cards Grid */}
        <MetricCards items={metrics} timeRangeText={rangeText} className="px-0 lg:px-0" />
      </div>

      <div className="px-4 lg:px-6 mt-6">
        <ChartAreaInteractive config={chartConfig} />
        <Separator className="my-4" />
        <h3 className="font-semibold text-lg">Aktivitas Terbaru</h3>
      </div>
      <DataTable
        persistenceKey="dashboard"
        onRefresh={refetch}
        addButtonLabel="Transaksi Baru"
        columns={transactionColumns}
        data={tableData}
        defaultTab="recent"
        tabs={[
          { value: "recent", label: "Transaksi" },
          { value: "active", label: "Produk" },
          { value: "low-stock", label: "Klien" }
        ]}
      />
    </PageContent>
  )
}

