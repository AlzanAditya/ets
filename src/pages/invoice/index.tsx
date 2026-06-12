import type { ColumnDef } from "@tanstack/react-table"
import { ReceiptIcon } from "lucide-react"

import { DataTable, type DataTableRow } from "@/components/data-table"
import { MetricCards } from "@/components/metric-cards"
import { PageContent } from "@/components/page-content"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { MetricCardItem } from "@/types/metrics"

interface InvoicePreviewRow extends DataTableRow {
  item: string
  status: string
  period: string
}

const metrics = [
  {
    label: "Invoice Preview",
    value: "2",
    delta: "+0%",
    trend: "up",
    summary: "Sample billing view",
    description: "Generic records for development",
    icon: ReceiptIcon,
  },
  {
    label: "Invoice Preview",
    value: "2",
    delta: "+0%",
    trend: "up",
    summary: "Sample billing view",
    description: "Generic records for development",
    icon: ReceiptIcon,
  },
  {
    label: "Invoice Preview",
    value: "2",
    delta: "+0%",
    trend: "up",
    summary: "Sample billing view",
    description: "Generic records for development",
    icon: ReceiptIcon,
  },
] satisfies MetricCardItem[]

const rows = [
  { id: 1, item: "Sample invoice", period: "Sample period", status: "Draft" },
  { id: 2, item: "Placeholder invoice", period: "Sample period", status: "Pending" },
] satisfies InvoicePreviewRow[]

const columns: ColumnDef<InvoicePreviewRow>[] = [
  { accessorKey: "item", header: "Invoice" },
  { accessorKey: "period", header: "Period" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge>,
  },
]

export default function InvoicePage() {
  return (
    <PageContent
      description="Komposisi awal untuk dokumen penagihan dan status invoice."
      eyebrow="Billing"
      title="Invoice"
    >
      <MetricCards items={metrics} />
      <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-3 lg:px-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Document State</CardTitle>
            <CardDescription>Placeholder summary for invoice workflow.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            No real invoice records are included in this development preview.
          </CardContent>
        </Card>
        <div className="lg:col-span-2">
          <DataTable
            persistenceKey="invoices"
            addButtonLabel="Invoice"
            columns={columns}
            data={rows}
            defaultTab="drafts"
            tabs={[
              { value: "drafts", label: "Drafts", badge: 2 },
              { value: "issued", label: "Issued", badge: 1 },
            ]}
          />
        </div>
      </div>
    </PageContent>
  )
}
