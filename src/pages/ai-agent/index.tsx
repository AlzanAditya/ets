import { BotIcon } from "lucide-react"

import { MetricCards } from "@/components/metric-cards"
import { PageContent } from "@/components/page-content"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { MetricCardItem } from "@/types/metrics"

const metrics = [
  {
    label: "Active Agents",
    value: "2",
    delta: "+1",
    trend: "up",
    summary: "Deployed AI assistants",
    description: "Operational status",
    icon: BotIcon,
  },
] satisfies MetricCardItem[]

export default function AIAgentPage() {
  return (
    <PageContent
      description="Konfigurasi dan pemantauan AI agent untuk otomasi bisnis."
      eyebrow="Intelligence"
      title="AI Agent"
    >
      <MetricCards items={metrics} />
      <div className="grid gap-4 px-4 lg:grid-cols-2 lg:px-6">
        <Card>
          <CardHeader><CardTitle>Support Bot</CardTitle></CardHeader>
          <CardContent>Status: Running - 98% uptime</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Data Processor</CardTitle></CardHeader>
          <CardContent>Status: Idle - Last task 2h ago</CardContent>
        </Card>
      </div>
    </PageContent>
  )
}
