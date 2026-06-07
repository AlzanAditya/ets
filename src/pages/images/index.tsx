import { ImageIcon } from "lucide-react"

import { MetricCards } from "@/components/metric-cards"
import { PageContent } from "@/components/page-content"
import { Card, CardContent } from "@/components/ui/card"
import type { MetricCardItem } from "@/types/metrics"

const metrics = [
  {
    label: "Total Images",
    value: "45",
    delta: "+0%",
    trend: "up",
    summary: "Assets in library",
    description: "Product and marketing imagery",
    icon: ImageIcon,
  },
] satisfies MetricCardItem[]

export default function ImagesPage() {
  return (
    <PageContent
      description="Manajemen koleksi aset visual dan media perusahaan."
      eyebrow="Assets"
      title="Images"
    >
      <MetricCards items={metrics} />
      <div className="grid grid-cols-2 gap-4 px-4 lg:grid-cols-4 lg:px-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Card key={i} className="aspect-square flex items-center justify-center bg-muted">
            <span className="text-xs text-muted-foreground">Image {i}</span>
          </Card>
        ))}
      </div>
    </PageContent>
  )
}
