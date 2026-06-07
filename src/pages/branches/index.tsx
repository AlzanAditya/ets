import { MapPinIcon } from "lucide-react"

import { MetricCards } from "@/components/metric-cards"
import { PageContent } from "@/components/page-content"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import type { MetricCardItem } from "@/types/metrics"

const metrics = [
  {
    label: "Total Branches",
    value: "5",
    delta: "+0%",
    trend: "up",
    summary: "Active locations",
    description: "Regional business nodes",
    icon: MapPinIcon,
  },
] satisfies MetricCardItem[]

export default function BranchesPage() {
  return (
    <PageContent
      description="Manajemen lokasi cabang dan operasional wilayah."
      eyebrow="Network"
      title="Branches"
    >
      <MetricCards items={metrics} />
      <div className="grid gap-4 px-4 lg:grid-cols-3 lg:px-6">
        {["Jakarta", "Bandung", "Surabaya", "Medan", "Makassar"].map((loc) => (
          <Card key={loc}>
            <CardContent className="pt-6">
              <CardTitle>{loc}</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">Active Status: offline</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContent>
  )
}
