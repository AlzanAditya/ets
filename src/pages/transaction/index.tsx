import type { ColumnDef } from "@tanstack/react-table"
import { Wallet2Icon } from "lucide-react"

import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable, type DataTableRow } from "@/components/data-table"
import { MetricCards } from "@/components/metric-cards"
import { PageContent } from "@/components/page-content"
import { Badge } from "@/components/ui/badge"
import type { InteractiveAreaChartConfig } from "@/types/charts"
import type { MetricCardItem } from "@/types/metrics"

interface TransactionPreviewRow extends DataTableRow {
  reference: string
  stage: string
  amount: string
}

const metrics = [
  {
    label: "Transaction Queue",
    value: "2",
    delta: "+0%",
    trend: "up",
    summary: "Sample queue state",
    description: "Placeholder transaction workflow",
    icon: Wallet2Icon,
  },
] satisfies MetricCardItem[]

const chart = {
  title: "Transaction Activity",
  description: "Sample activity for development preview",
  compactDescription: "Preview activity",
  data: [
    { date: "2024-01-01", desktop: 12, mobile: 9 },
    { date: "2024-01-02", desktop: 16, mobile: 11 },
    { date: "2024-01-03", desktop: 10, mobile: 14 },
    { date: "2024-01-04", desktop: 18, mobile: 15 },
  ],
  chartConfig: {
    desktop: { label: "Primary", color: "var(--primary)" },
    mobile: { label: "Secondary", color: "var(--primary)" },
  },
  ranges: [
    { value: "7d", label: "Last 7 days", days: 7 },
    { value: "30d", label: "Last 30 days", days: 30 },
  ],
  defaultRange: "7d",
  mobileRange: "7d",
  referenceDate: "2024-01-04",
} satisfies InteractiveAreaChartConfig

const rows = [
  { id: 1, reference: "Sample reference", stage: "Queued", amount: "0" },
  { id: 2, reference: "Preview reference", stage: "Draft", amount: "0" },
] satisfies TransactionPreviewRow[]

const columns: ColumnDef<TransactionPreviewRow>[] = [
  { accessorKey: "reference", header: "Reference" },
  { accessorKey: "amount", header: () => <div className="text-right">Amount</div> },
  {
    accessorKey: "stage",
    header: "Stage",
    cell: ({ row }) => <Badge variant="outline">{row.original.stage}</Badge>,
  },
]

export default function TransactionPage() {
  return (
    <PageContent
      description="Ruang kerja awal untuk melihat aktivitas dan daftar transaksi."
      eyebrow="Operations"
      title="Transaction"
    >
      <MetricCards items={metrics} />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive config={chart} />
      </div>
      <DataTable
        addButtonLabel="Prepare Transaction"
        columns={columns}
        data={rows}
        defaultTab="queue"
        tabs={[
          { value: "queue", label: "Queue" },
          { value: "history", label: "History" },
        ]}
      />
    </PageContent>
  )
}
