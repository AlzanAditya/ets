import * as React from "react"
import { useDashboard } from "@/hooks/use-dashboard"
import { DashboardSkeleton } from "@/components/dashboard-skeleton"
import { ErrorState } from "@/components/error-state"
import { MetricCards } from "@/components/metric-cards"
import { GreetingCard, type TimeRangeOption } from "@/components/greeting-card"
import { ActiveIndicatorsCards } from "@/components/dashboard/active-indicators-cards"
import { PageContent } from "@/components/page-content"
import { Badge } from "@/components/ui/badge"
import type { MetricCardItem } from "@/types/metrics"
import { useAuth } from "@/contexts/auth-context"
import {
  UsersIcon,
  PackageIcon,
} from "lucide-react"

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

  // Metric cards with Donut Pie Charts (Produk and Klien) using real database data
  const garansiProductsVal = data.metrics.garansiProducts ?? 0
  const maintenanceProductsVal = data.metrics.maintenanceProducts ?? 0

  const clientSafeVal = data.metrics.clientsSafe ?? 0
  const clientRepairVal = data.metrics.clientsInRepair ?? 0

  const metrics: MetricCardItem[] = [
    // Donut Pie Chart Produk
    {
      type: "donut",
      id: "produk-status-donut",
      centerIcon: PackageIcon,
      items: [
        {
          label: "Produk Aman",
          value: garansiProductsVal,
          color: "bg-emerald-500",
        },
        {
          label: "Produk Bermasalah",
          value: maintenanceProductsVal,
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

  return (
    <PageContent
      actions={<Badge variant="outline">Enterprise System</Badge>}
      description="Overview module untuk memantau ringkasan performa, aktivitas, dan daftar kerja utama."
      eyebrow="Overview"
      title="Dashboard"
    >
      <div className="px-4 lg:px-6 space-y-5 pb-6">
        {/* 1. Greeting Card component */}
        <GreetingCard
          userName={userName}
          selectedRange={selectedRange}
          onRangeChange={(range) => setSelectedRange(range)}
        />

        {/* 2. Active Worker & Active Client Indicators Cards */}
        <ActiveIndicatorsCards />

        {/* 3. Metric Cards Grid */}
        <MetricCards items={metrics} timeRangeText={rangeText} className="px-0 lg:px-0" />
      </div>
    </PageContent>
  )
}

