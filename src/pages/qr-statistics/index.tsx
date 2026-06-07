import { BarChart3Icon } from "lucide-react"

import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { MetricCards } from "@/components/metric-cards"
import { PageContent } from "@/components/page-content"
import type { InteractiveAreaChartConfig } from "@/types/charts"
import type { MetricCardItem } from "@/types/metrics"

const metrics = [
  {
    label: "Total QR Scans",
    value: "1.2k",
    delta: "+12%",
    trend: "up",
    summary: "Scans this month",
    description: "Real-time engagement metrics",
    icon: BarChart3Icon,
  },
] satisfies MetricCardItem[]

const chart = {
  title: "Scan Activity",
  description: "QR code engagement trend",
  compactDescription: "Activity trend",
  data: [
    { date: "2024-01-01", desktop: 45, mobile: 30 },
    { date: "2024-01-02", desktop: 52, mobile: 38 },
    { date: "2024-01-03", desktop: 48, mobile: 42 },
  ],
  chartConfig: {
    desktop: { label: "Scans", color: "var(--primary)" },
    mobile: { label: "Unique", color: "var(--primary)" },
  },
  ranges: [{ value: "7d", label: "Last 7 days", days: 7 }],
  defaultRange: "7d",
  mobileRange: "7d",
  referenceDate: "2024-01-03",
} satisfies InteractiveAreaChartConfig

export default function QRStatisticsPage() {
  return (
    <PageContent
      description="Visualisasi performa dan data interaksi QR code."
      eyebrow="Analytics"
      title="QR Statistics"
    >
      <MetricCards items={metrics} />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive config={chart} />
      </div>
    </PageContent>
  )
}
