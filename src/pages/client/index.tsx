import type { ColumnDef } from "@tanstack/react-table"
import { UsersIcon } from "lucide-react"

import { DataTable, type DataTableRow } from "@/components/data-table"
import { MetricCards } from "@/components/metric-cards"
import { PageContent } from "@/components/page-content"
import { Badge } from "@/components/ui/badge"
import type { MetricCardItem } from "@/types/metrics"

interface ClientPreviewRow extends DataTableRow {
  name: string
  gmail: string
  status: string
  product: string
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
  { id: 1, name: "zanxa", gmail: "zanxastudio@gmail.com", status: "Active", product: "UPS 19KVA" },
  { id: 2, name: "alzan", gmail: "alzanadytia.j@gmail.com", status: "Review", product: "UPS 120KVA" },
  { id: 3, name: "Development account", gmail: "[EMAIL_ADDRESS]", status: "Draft", product: "UPS 60KVA" },
] satisfies ClientPreviewRow[]

const columns: ColumnDef<ClientPreviewRow>[] = [
  { accessorKey: "name", header: "Clients" },
  { accessorKey: "product", header: "Product" },
  { accessorKey: "gmail", header: "Gmail" },
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
      <MetricCards items={metrics} />
      <div className="grid grid-cols-1 gap-4">
        <DataTable
          addButtonLabel="Prepare Client"
          columns={columns}
          data={rows}
          defaultTab="accounts"
          tabs={[
            { value: "accounts", label: "Accounts" },
            { value: "gmail", label: "Gmail" },
          ]}
        />
      </div>
    </PageContent>
  )
}
