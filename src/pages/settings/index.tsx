import { SettingsIcon } from "lucide-react"

import { MetricCards } from "@/components/metric-cards"
import { PageContent } from "@/components/page-content"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { MetricCardItem } from "@/types/metrics"

const metrics = [
  {
    label: "Settings Groups",
    value: "3",
    delta: "+0%",
    trend: "up",
    summary: "Sample configuration sections",
    description: "Development preview only",
    icon: SettingsIcon,
  },
] satisfies MetricCardItem[]

export default function SettingsPage() {
  return (
    <PageContent
      description="Komposisi awal untuk preferensi aplikasi dan konfigurasi workspace."
      eyebrow="Administration"
      title="Settings"
    >
      <MetricCards items={metrics} />
      <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-3 lg:px-6">
        {["Profile", "Appearance", "Access"].map((section) => (
          <Card key={section}>
            <CardHeader>
              <CardTitle>{section}</CardTitle>
              <CardDescription>Placeholder settings section.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Sample option</span>
                <Badge variant="outline">Preview</Badge>
              </div>
              <Separator />
              <div className="text-muted-foreground">
                No real settings are stored in this preview.
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContent>
  )
}
