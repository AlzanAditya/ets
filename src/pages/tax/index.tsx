import { LandmarkIcon } from "lucide-react"

import { MetricCards } from "@/components/metric-cards"
import { PageContent } from "@/components/page-content"
import { Card, CardContent } from "@/components/ui/card"
import type { MetricCardItem } from "@/types/metrics"

const metrics = [
  {
    label: "Pending Tax",
    value: "12.5M",
    delta: "-2%",
    trend: "down",
    summary: "Obligation to be paid",
    description: "Period: June 2026",
    icon: LandmarkIcon,
  },
] satisfies MetricCardItem[]

export default function TaxPage() {
  return (
    <PageContent
      description="Ringkasan kewajiban pajak dan histori pelaporan perusahaan."
      eyebrow="Finance"
      title="Tax"
    >
      <MetricCards items={metrics} />
      <div className="px-4 lg:px-6">
        <Card>
          <CardContent className="pt-6">
            <p>Detailed tax breakdowns and upcoming filing deadlines will appear here.</p>
          </CardContent>
        </Card>
      </div>
    </PageContent>
  )
}
