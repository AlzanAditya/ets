import type { ColumnDef } from "@tanstack/react-table"
import { PackageIcon, LandmarkIcon, UserCheckIcon, HammerIcon } from "lucide-react"
import { useProducts } from "@/hooks/use-products"
import { useProductCount } from "@/hooks/use-products"
import { TableSkeleton } from "@/components/table-skeleton"
import { ErrorState } from "@/components/error-state"
import { EmptyState } from "@/components/empty-state"
import { DataTable, type DataTableRow } from "@/components/data-table"
import { MetricCards } from "@/components/metric-cards"
import { PageContent } from "@/components/page-content"
import { Badge } from "@/components/ui/badge"
import type { MetricCardItem } from "@/types/metrics"
import type { ProductWithRelations } from "@/services/products.service"

interface ProductRowWithId extends DataTableRow, ProductWithRelations {}

const columns: ColumnDef<ProductRowWithId>[] = [
  {
    accessorKey: "nomor_seri",
    header: "Nomor Seri",
    cell: ({ row }) => (
      <span className="font-mono text-xs font-semibold tracking-wider text-foreground bg-muted px-1.5 py-0.5 rounded">
        {row.original.nomor_seri}
      </span>
    ),
  },
  {
    accessorKey: "nama_produk",
    header: "Nama Produk",
    cell: ({ row }) => <span className="font-medium">{row.original.nama_produk}</span>,
  },
  {
    accessorKey: "category",
    header: "Kategori",
    cell: ({ row }) => (
      <Badge variant="outline" className="text-muted-foreground">
        {row.original.category || "General"}
      </Badge>
    ),
  },
  {
    id: "location",
    header: "Lokasi Gudang/Cabang",
    cell: ({ row }) => {
      const branch = row.original.branch
      return branch ? (
        <span className="text-sm text-foreground flex items-center gap-1.5">
          <LandmarkIcon className="h-3.5 w-3.5 text-muted-foreground" />
          {branch.branch_name}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      )
    },
  },
  {
    id: "holder",
    header: "Klien Pemegang",
    cell: ({ row }) => {
      const client = row.original.client
      return client ? (
        <span className="text-sm text-foreground flex items-center gap-1.5">
          <UserCheckIcon className="h-3.5 w-3.5 text-muted-foreground" />
          {client.client_name}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      )
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const statusColors: Record<string, string> = {
        active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        deployed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        sold: "bg-violet-500/10 text-violet-500 border-violet-500/20",
        maintenance: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        inactive: "bg-muted text-muted-foreground border-transparent",
      }
      const statusLabels: Record<string, string> = {
        active: "Aktif (Gudang)",
        deployed: "Terpasang (Klien)",
        sold: "Terjual",
        maintenance: "Servis",
        inactive: "Nonaktif",
      }
      return (
        <Badge variant="outline" className={statusColors[row.original.status] ?? ""}>
          {statusLabels[row.original.status] ?? row.original.status}
        </Badge>
      )
    },
  },
]

export default function ProductsPage() {
  const { data: allProducts, loading, error, refetch } = useProducts()
  
  // Fetch real count statistics for metric cards
  const { count: totalCount } = useProductCount()
  const { count: activeCount } = useProductCount("active")
  const { count: deployedCount } = useProductCount("deployed")
  const { count: maintenanceCount } = useProductCount("maintenance")

  if (loading) {
    return (
      <PageContent
        description="Memuat katalog produk dan status aset dari database..."
        eyebrow="Inventory"
        title="Products"
      >
        <div className="px-4 lg:px-6 space-y-6">
          <TableSkeleton columnCount={6} rowCount={8} />
        </div>
      </PageContent>
    )
  }

  if (error) {
    return (
      <PageContent
        description="Gagal memuat katalog produk."
        eyebrow="Inventory"
        title="Products"
      >
        <div className="px-4 lg:px-6">
          <ErrorState message={error} onRetry={refetch} />
        </div>
      </PageContent>
    )
  }

  const metrics: MetricCardItem[] = [
    {
      label: "Total Katalog Aset",
      value: totalCount.toLocaleString("id-ID"),
      delta: "+0%",
      trend: "up",
      summary: "Semua aset terdaftar",
      description: "Tidak termasuk retired",
      icon: PackageIcon,
    },
    {
      label: "Aset Aktif di Gudang",
      value: activeCount.toLocaleString("id-ID"),
      delta: "+0%",
      trend: "up",
      summary: "Ready untuk dideploy",
      description: "Tersimpan di cabang/gudang",
      icon: LandmarkIcon,
    },
    {
      label: "Aset Terpasang (Client)",
      value: deployedCount.toLocaleString("id-ID"),
      delta: "+0%",
      trend: "up",
      summary: "Tersewa/dipinjamkan",
      description: "Dalam operasional klien",
      icon: UserCheckIcon,
    },
    {
      label: "Aset Sedang Servis",
      value: maintenanceCount.toLocaleString("id-ID"),
      delta: "+0%",
      trend: "up",
      summary: "Dalam proses perbaikan",
      description: "Membutuhkan atensi",
      icon: HammerIcon,
    },
  ]

  // Map products to include DataTable's required ID field
  const mappedAll: ProductRowWithId[] = allProducts.map((p) => ({
    id: p.product_id,
    ...p,
  }))

  const mappedActive = mappedAll.filter((p) => p.status === "active")
  const mappedDeployed = mappedAll.filter((p) => p.status === "deployed")
  const mappedMaintenance = mappedAll.filter((p) => p.status === "maintenance")

  return (
    <PageContent
      description="Kelola seluruh katalog produk, status kepemilikan, lokasi gudang, dan klien."
      eyebrow="Inventory"
      title="Products"
    >
      <MetricCards items={metrics} />
      
      {allProducts.length === 0 ? (
        <div className="px-4 lg:px-6">
          <EmptyState
            title="Katalog Produk Kosong"
            description="Belum ada aset terdaftar di sistem. Mulai tambahkan aset baru."
            actionLabel="Tambah Aset Baru"
            onAction={() => alert("Form tambah produk akan segera tersedia.")}
          />
        </div>
      ) : (
        <DataTable
          addButtonLabel="Tambah Aset"
          columns={columns}
          data={mappedAll}
          defaultTab="all"
          tabs={[
            {
              value: "all",
              label: "Semua Aset",
              badge: mappedAll.length,
              content: (
                <DataTable
                  addButtonLabel="Tambah Aset"
                  columns={columns}
                  data={mappedAll}
                  defaultTab="all"
                />
              ),
            },
            {
              value: "active",
              label: "Di Gudang (Aktif)",
              badge: mappedActive.length,
              content: (
                <DataTable
                  addButtonLabel="Tambah Aset"
                  columns={columns}
                  data={mappedActive}
                  defaultTab="active"
                />
              ),
            },
            {
              value: "deployed",
              label: "Di Klien (Deployed)",
              badge: mappedDeployed.length,
              content: (
                <DataTable
                  addButtonLabel="Tambah Aset"
                  columns={columns}
                  data={mappedDeployed}
                  defaultTab="deployed"
                />
              ),
            },
            {
              value: "maintenance",
              label: "Dalam Servis",
              badge: mappedMaintenance.length,
              content: (
                <DataTable
                  addButtonLabel="Tambah Aset"
                  columns={columns}
                  data={mappedMaintenance}
                  defaultTab="maintenance"
                />
              ),
            },
          ]}
        />
      )}
    </PageContent>
  )
}
