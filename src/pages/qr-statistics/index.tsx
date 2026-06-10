import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { BarChart3Icon, ActivityIcon, QrCodeIcon, GlobeIcon, LaptopIcon } from "lucide-react"
import { useScanStats, useScanTrend, useRecentScanLogs } from "@/hooks/use-scan-logs"
import { TableSkeleton } from "@/components/table-skeleton"
import { ErrorState } from "@/components/error-state"
import { EmptyState } from "@/components/empty-state"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable, type DataTableRow } from "@/components/data-table"
import { MetricCards } from "@/components/metric-cards"
import { PageContent } from "@/components/page-content"
import { useTableSchema } from "@/hooks/use-table-schema"
import { mergeDynamicColumns } from "@/lib/dynamic-columns"
import type { InteractiveAreaChartConfig } from "@/types/charts"
import type { MetricCardItem } from "@/types/metrics"
import type { ScanLogWithRelations } from "@/services/scan-logs.service"

interface ScanLogWithId extends Omit<ScanLogWithRelations, "id">, DataTableRow { }

const PINNED_COLUMNS: ColumnDef<ScanLogWithId>[] = [
  {
    accessorKey: "scanned_at",
    header: "Waktu Scan",
    cell: ({ row }) => {
      const date = new Date(row.original.scanned_at)
      return (
        <span className="text-sm font-medium text-foreground">
          {date.toLocaleString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </span>
      )
    },
  },
  {
    accessorKey: "nomor_seri",
    header: "Nomor Seri Aset",
    cell: ({ row }) => (
      <span className="font-mono text-xs font-semibold tracking-wider text-foreground bg-muted px-1.5 py-0.5 rounded">
        {row.original.nomor_seri}
      </span>
    ),
  },
  {
    id: "product_name",
    header: "Nama Aset",
    cell: ({ row }) => {
      const product = row.original.product
      return product ? (
        <span className="font-medium text-foreground">{product.nama_produk}</span>
      ) : (
        <span className="text-muted-foreground italic text-xs">Produk tidak dikenal</span>
      )
    },
  },
  {
    accessorKey: "ip_address",
    header: "IP Address",
    cell: ({ row }) => (
      <span className="font-mono text-sm text-muted-foreground">
        {row.original.ip_address || "Unknown"}
      </span>
    ),
  },
  {
    accessorKey: "referer",
    header: "Referer / Platform",
    cell: ({ row }) => (
      <div className="flex items-center gap-1 text-sm text-muted-foreground max-w-[150px] truncate">
        <GlobeIcon className="h-3 w-3 flex-shrink-0" />
        <span className="truncate" title={row.original.referer || "Direct Scan"}>
          {row.original.referer || "Direct Scan"}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "user_agent",
    header: "Browser / Device",
    cell: ({ row }) => {
      const ua = row.original.user_agent || ""
      let device = "Direct"
      if (ua.includes("Mobi") || ua.includes("Android") || ua.includes("iPhone")) {
        device = "Mobile Device"
      } else if (ua.includes("Windows") || ua.includes("Macintosh") || ua.includes("Linux")) {
        device = "Desktop PC"
      }
      return (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground max-w-[180px] truncate">
          <LaptopIcon className="h-3 w-3 flex-shrink-0" />
          <span className="truncate" title={ua}>
            {device} ({ua.split(" ")[0] || "Browser"})
          </span>
        </div>
      );
    },
  },
]

export default function QRStatisticsPage() {
  const { stats, loading: loadingStats, error: errorStats } = useScanStats()
  const { data: trend, loading: loadingTrend, error: errorTrend } = useScanTrend(30)
  const { data: logs, loading: loadingLogs, error: errorLogs, refetch } = useRecentScanLogs(50)
  const [activeTab, setActiveTab] = React.useState("all")

  // ── Dynamic Schema ──────────────────────────────────────────────────────────
  const { columns: schemaColumns } = useTableSchema("scan_logs")
  const columns = React.useMemo(
    () => mergeDynamicColumns<ScanLogWithId>(PINNED_COLUMNS, schemaColumns, ["id", "product_id"]),
    [schemaColumns]
  )

  const isLoading = loadingStats || loadingTrend || loadingLogs
  const hasError = errorStats || errorTrend || errorLogs

  if (isLoading) {
    return (
      <PageContent
        description="Memuat data scan dan interaksi QR code real-time..."
        eyebrow="Analytics"
        title="QR Statistics"
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
        description="Gagal memuat analitik QR Statistics."
        eyebrow="Analytics"
        title="QR Statistics"
      >
        <div className="px-4 lg:px-6">
          <ErrorState message={errorStats || errorTrend || errorLogs} onRetry={refetch} />
        </div>
      </PageContent>
    )
  }

  const metrics: MetricCardItem[] = [
    {
      label: "Total QR Scan",
      value: (stats?.total_scans ?? 0).toLocaleString("id-ID"),
      delta: "+0%",
      trend: "up",
      summary: "Total scan tercatat",
      description: "Dari penayangan publik kode QR",
      icon: BarChart3Icon,
    },
    {
      label: "Scan Bulan Ini",
      value: (stats?.scans_this_month ?? 0).toLocaleString("id-ID"),
      delta: "+0%",
      trend: "up",
      summary: "Volume scan bulan berjalan",
      description: "Tingkat keterlibatan terkini",
      icon: ActivityIcon,
    },
    {
      label: "Aset Unik Ter-scan",
      value: (stats?.unique_products_scanned ?? 0).toLocaleString("id-ID"),
      delta: "+0%",
      trend: "up",
      summary: "Aset unik terdeteksi",
      description: "Dari total produk di database",
      icon: QrCodeIcon,
    },
  ]

  // Map daily scan trend data
  const today = new Date().toISOString().split("T")[0]
  const chartData = trend.map((t) => ({
    date: t.date,
    desktop: t.scans, // Desktop -> Total Scans
    mobile: t.scans,  // Mobile -> Duplicate for rendering
  }))

  const chartConfig: InteractiveAreaChartConfig = {
    title: "Grafik Aktivitas Scan QR",
    description: "Tren jumlah scan QR code produk harian",
    compactDescription: "Tren Scan",
    data: chartData,
    chartConfig: {
      desktop: { label: "Total Scan", color: "var(--primary)" },
      mobile: { label: "Scan Unik", color: "var(--)" },
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
  const mappedLogs: ScanLogWithId[] = logs.map((log) => ({
    ...log,
    id: String(log.id),
  }))

  return (
    <PageContent
      description="Visualisasi performa, frekuensi scan, dan log akses publik kode QR aset."
      eyebrow="Analytics"
      title="QR Statistics"
    >
      <MetricCards items={metrics} />

      <div className="px-4 lg:px-6">
        <ChartAreaInteractive config={chartConfig} />
      </div>

      {logs.length === 0 ? (
        <div className="px-4 lg:px-6">
          <EmptyState
            title="Belum Ada Aktivitas Scan"
            description="Tidak ada riwayat scan QR code tercatat di database."
          />
        </div>
      ) : (
        <DataTable
          addButtonLabel="Ekspor Log"
          columns={columns}
          data={mappedLogs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={[
            {
              value: "all",
              label: "Log Scan QR",
              badge: mappedLogs.length,
            },
          ]}
        />
      )}
    </PageContent>
  )
}
