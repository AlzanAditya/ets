import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { MetricCards } from "@/components/metric-cards"
import { PageContent } from "@/components/page-content"
import { DashboardDataTable } from "@/features/dashboard/components/dashboard-data-table"
import { dashboardAreaChart } from "@/features/dashboard/config/chart"
import { dashboardMetrics } from "@/features/dashboard/config/metrics"
import data from "@/features/dashboard/data/table-data.json"
import type { DashboardTableRow } from "@/features/dashboard/types"

export default function DashboardPage() {
  return (
    <PageContent
      actions={null}
      description="Overview module untuk memantau ringkasan performa, aktivitas, dan daftar kerja utama."
      eyebrow="Overview"
      title="Dashboard"
    >
      <MetricCards items={dashboardMetrics} />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive config={dashboardAreaChart} />
      </div>
      <DashboardDataTable data={data satisfies DashboardTableRow[]} />
    </PageContent>
  )
}
