import type { ColumnDef } from "@tanstack/react-table"
import { PackageIcon } from "lucide-react"

import { DataTable, type DataTableRow } from "@/components/data-table"
import { MetricCards } from "@/components/metric-cards"
import { PageContent } from "@/components/page-content"
import { Badge } from "@/components/ui/badge"
import type { MetricCardItem } from "@/types/metrics"

interface ProductPreviewRow extends DataTableRow {
  name: string
  status: string
  category: string
}

const metrics = [
  {
    label: "Catalog Preview",
    value: "3",
    delta: "+0%",
    trend: "up",
    summary: "Sample product grouping",
    description: "Generic development records only",
    icon: PackageIcon,
  },
] satisfies MetricCardItem[]

const rows = [
  { id: 1, name: "Sample product", category: "Sample category", status: "Draft" },
  { id: 2, name: "Placeholder item", category: "Sample category", status: "Review" },
  { id: 3, name: "Development item", category: "Sample group", status: "Active" },
] satisfies ProductPreviewRow[]

const columns: ColumnDef<ProductPreviewRow>[] = [
  { accessorKey: "name", header: "Item" },
  { accessorKey: "category", header: "Category" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge>,
  },
]

export default function ProductsPage() {
  return (
    <PageContent
      description="Area komposisi awal untuk pengelolaan katalog dan item module."
      eyebrow="Inventory"
      title="Products"
    >
      <MetricCards items={metrics} />
      <DataTable
        addButtonLabel="Prepare Product"
        columns={columns}
        data={rows}
        defaultTab="products"
        tabs={[
          { value: "products", label: "Products" },
          { value: "categories", label: "Categories" },
          { value: "imports", label: "Imports" },
        ]}
      />
    </PageContent>
  )
}
