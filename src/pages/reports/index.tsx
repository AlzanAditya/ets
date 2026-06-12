import { FileChartColumnIcon } from "lucide-react"

import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { MetricCards } from "@/components/metric-cards"
import { PageContent } from "@/components/page-content"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { InteractiveAreaChartConfig } from "@/types/charts"
import type { MetricCardItem } from "@/types/metrics"

const metrics = [
  {
    label: "Report Sets",
    value: "4",
    delta: "+0%",
    trend: "up",
    summary: "Sample reporting groups",
    description: "Generic development preview",
    icon: FileChartColumnIcon,
  },
] satisfies MetricCardItem[]

const chart = {
  title: "Report Trend",
  description: "Sample reporting signal for development preview",
  compactDescription: "Preview signal",
  data: [
    { date: "2024-01-01", desktop: 4, mobile: 2 },
    { date: "2024-01-02", desktop: 6, mobile: 3 },
    { date: "2024-01-03", desktop: 5, mobile: 5 },
    { date: "2024-01-04", desktop: 8, mobile: 4 },
  ],
  chartConfig: {
    desktop: { label: "Primary", color: "var(--primary)" },
    mobile: { label: "Secondary", color: "var(--primary)" },
  },
  ranges: [
    { value: "7d", label: "7 Hari", days: 7 },
    { value: "30d", label: "30 Hari", days: 30 },
  ],
  defaultRange: "7d",
  mobileRange: "7d",
  referenceDate: "2024-01-04",
} satisfies InteractiveAreaChartConfig

export default function ReportsPage() {
  return (
    <PageContent
      description="Komposisi awal untuk ringkasan laporan dan analisis module."
      eyebrow="Analytics"
      title="Reports"
    >
      <MetricCards items={metrics} />
      <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-[2fr_1fr] lg:px-6">
        <ChartAreaInteractive config={chart} />
        <Card>
          <CardHeader>
            <CardTitle>Report Library</CardTitle>
            <CardDescription>Placeholder categories for development.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-muted-foreground">
            <div>Sample summary</div>
            <div>Sample export queue</div>
            <div>Sample saved view</div>
          </CardContent>
        </Card>
      </div>
    </PageContent>
  )
}
