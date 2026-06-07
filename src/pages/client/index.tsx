import type { ColumnDef } from "@tanstack/react-table"
import { UsersIcon } from "lucide-react"

import { DataTable, type DataTableRow } from "@/components/data-table"
import { MetricCards } from "@/components/metric-cards"
import { PageContent } from "@/components/page-content"
import { Badge } from "@/components/ui/badge"
import type { MetricCardItem } from "@/types/metrics"

interface ClientPreviewRow extends DataTableRow {
  name: string
  segment: string
  status: string
}

const metrics = [
  {
    label: "Client Workspace",
    value: "3",
    delta: "+0%",
    trend: "up",
    summary: "Sample client grouping",
    description: "Placeholder data for module layout",
    icon: UsersIcon,
  },
] satisfies MetricCardItem[]

const rows = [
  { id: 1, name: "Sample account", segment: "Sample segment", status: "Active" },
  { id: 2, name: "Preview account", segment: "Sample segment", status: "Review" },
  { id: 3, name: "Development account", segment: "Sample group", status: "Draft" },
] satisfies ClientPreviewRow[]

const columns: ColumnDef<ClientPreviewRow>[] = [
  { accessorKey: "name", header: "Account" },
  { accessorKey: "segment", header: "Segment" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge>,
  },
]

export default function ClientPage() {
  return (
    <PageContent
      description="Komposisi awal untuk daftar akun dan struktur relasi client."
      eyebrow="Relationships"
      title="Client"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <MetricCards items={metrics} />
        <DataTable
          addButtonLabel="Prepare Client"
          columns={columns}
          data={rows}
          defaultTab="accounts"
          tabs={[
            { value: "accounts", label: "Accounts" },
            { value: "segments", label: "Segments" },
          ]}
        />
      </div>
    </PageContent>
  )
}
