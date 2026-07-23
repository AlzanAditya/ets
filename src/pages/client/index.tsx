import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { ClientViewMode } from "./components/client-view-mode";
import { ClientEditMode } from "./components/client-edit-mode";
import { useBreadcrumb } from "@/contexts/breadcrumb-context";

import {
  useClients,
  useCreateClientMutation,
  useUpdateClientMutation,
} from "@/hooks/use-clients";
import { useProducts } from "@/hooks/use-products";
import { useTableSchema } from "@/hooks/use-table-schema";
import { mergeDynamicColumns } from "@/lib/dynamic-columns";
import { DataTable, type DataTableRow } from "@/components/data-table";
import { MetricCards } from "@/components/metric-cards";
import { PageContent } from "@/components/page-content";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import type { MetricCardItem } from "@/types/metrics";
import type { ClientRow, ClientInsert, ProductRow } from "@/types/database";

// ─── Default Empty Fields ──────────────────────────────────────────────────────

function emptyFields(): ClientInsert {
  return {
    client_code: "",
    customer_name: "",
    customer_name_alias: null,
    email: null,
    phone_number: null,
    whatsapp_number: null,
    address: null,
    city: null,
    province: null,
    postal_code: null,
    notes: null,
  };
}

// ─── Pinned Columns for Main Client Table ──────────────────────────────────────

type ClientRowWithId = ClientRow & DataTableRow;

const PINNED_COLUMNS: ColumnDef<ClientRowWithId>[] = [
  {
    accessorKey: "client_code",
    header: "Kode Klien",
    cell: ({ row }) => (
      <span className="font-mono text-xs font-semibold tracking-wider text-foreground bg-muted px-1.5 py-0.5 rounded">
        {row.original.client_code}
      </span>
    ),
  },
  {
    accessorKey: "customer_name",
    header: "Nama Pelanggan",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.customer_name}</span>
    ),
  },
  {
    accessorKey: "customer_name_alias",
    header: "Alias",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {row.original.customer_name_alias || "—"}
      </span>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.email || "—"}</span>
    ),
  },
  {
    accessorKey: "phone_number",
    header: "No. Telepon",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.phone_number || "—"}
      </span>
    ),
  },
  {
    accessorKey: "city",
    header: "Kota/Provinsi",
    cell: ({ row }) => {
      const city = row.original.city;
      const prov = row.original.province;
      if (city && prov)
        return (
          <span>
            {city}, {prov}
          </span>
        );
      return <span>{city || prov || "—"}</span>;
    },
  },
];

const EXCLUDED_COLUMNS = ["client_id", "deleted_at", "province"];

// ─── Pinned Columns for Client Products Table ──────────────────────────────────
// Default columns: nomor_seri, nama_produk, status

type ProductRowWithId = ProductRow & DataTableRow;

const CLIENT_PRODUCT_PINNED_COLUMNS: ColumnDef<ProductRowWithId>[] = [
  {
    accessorKey: "nomor_seri",
    header: "No. Seri",
    cell: ({ row }) => (
      <span className="font-mono text-xs font-semibold tracking-wider text-foreground bg-muted px-2 py-0.5 rounded">
        {row.original.nomor_seri}
      </span>
    ),
  },
  {
    accessorKey: "nama_produk",
    header: "Nama Produk",
    cell: ({ row }) => (
      <span className="font-medium text-foreground">{row.original.nama_produk}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      const statusLabels: Record<string, string> = {
        active: "Tersedia",
        deployed: "Terpasang",
        sold: "Terjual",
        maintenance: "Maintenance",
        inactive: "Nonaktif",
        retired: "Afkir",
      };
      const statusColors: Record<string, string> = {
        active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        deployed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        sold: "bg-purple-500/10 text-purple-500 border-purple-500/20",
        maintenance: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        inactive: "bg-muted text-muted-foreground border-transparent",
        retired: "bg-destructive/10 text-destructive border-destructive/20",
      };
      return (
        <Badge
          variant="outline"
          className={statusColors[status] || "bg-muted text-muted-foreground"}
        >
          {statusLabels[status] || status}
        </Badge>
      );
    },
  },
];

const CLIENT_PRODUCT_EXCLUDED_COLUMNS = [
  "product_id",
  "created_at",
  "deleted_at",
  "current_client_id",
];

// ─── Component ─────────────────────────────────────────────────────────────────

export default function ClientPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { setBreadcrumb } = useBreadcrumb();

  const isFormActive = location.pathname.endsWith("/add") || !!id;
  const isEditMode =
    searchParams.has("edit") ||
    location.search.includes("edit") ||
    location.pathname.endsWith("/add");

  const { data: allClients = [], loading, error, refetch } = useClients();
  const { data: allProducts = [] } = useProducts();
  const createMutation = useCreateClientMutation();
  const updateMutation = useUpdateClientMutation();

  // Avatar state & upload reference
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // ── Dynamic Schema for Clients ──────────────────────────────────────────────
  const { columns: schemaColumns } = useTableSchema("clients");
  const columns = React.useMemo(
    () => mergeDynamicColumns<ClientRowWithId>(PINNED_COLUMNS, schemaColumns, EXCLUDED_COLUMNS),
    [schemaColumns]
  );

  // ── Dynamic Schema for Client Products Table ────────────────────────────────
  const { columns: productSchemaColumns } = useTableSchema("products");
  const clientProductColumns = React.useMemo(
    () =>
      mergeDynamicColumns<ProductRowWithId>(
        CLIENT_PRODUCT_PINNED_COLUMNS,
        productSchemaColumns,
        CLIENT_PRODUCT_EXCLUDED_COLUMNS
      ),
    [productSchemaColumns]
  );

  const [editTarget, setEditTarget] = React.useState<ClientRow | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [fields, setFields] = React.useState<ClientInsert>(emptyFields());

  function setField<K extends keyof ClientInsert>(
    key: K,
    value: ClientInsert[K]
  ) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  // Synchronize breadcrumbs & avatar with URL
  React.useEffect(() => {
    if (!isFormActive) {
      setBreadcrumb(null, null);
      setEditTarget(null);
      setAvatarUrl(null);
      return;
    }

    if (location.pathname.endsWith("/client/add") || location.pathname.endsWith("/add")) {
      setBreadcrumb("Add", null);
      setFields(emptyFields());
      setEditTarget(null);
      setAvatarUrl(null);
    } else if (id) {
      const client = allClients.find((c) => c.client_id === id);
      if (client) {
        setBreadcrumb(client.customer_name, client.client_id);
        setEditTarget(client);
        setFields({
          client_code: client.client_code,
          customer_name: client.customer_name,
          customer_name_alias: client.customer_name_alias ?? null,
          email: client.email ?? "",
          phone_number: client.phone_number ?? "",
          whatsapp_number: client.whatsapp_number ?? "",
          address: client.address ?? "",
          city: client.city ?? "",
          province: client.province ?? "",
          postal_code: client.postal_code ?? "",
          notes: client.notes ?? "",
        });

        // Load avatar from localStorage
        const savedAvatar = localStorage.getItem(`client_avatar_${client.client_id}`);
        setAvatarUrl(savedAvatar || null);
      } else if (!loading && allClients.length > 0) {
        navigate("/client");
      }
    }
  }, [id, location.pathname, isFormActive, allClients, loading, setBreadcrumb, navigate]);

  // Convert uploaded image file to 90x90 WebP data URL
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 90;
        canvas.height = 90;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 90, 90);
          const webpDataUrl = canvas.toDataURL("image/webp", 0.9);
          setAvatarUrl(webpDataUrl);
          if (editTarget?.client_id) {
            localStorage.setItem(`client_avatar_${editTarget.client_id}`, webpDataUrl);
          }
          toast.success("Foto profil berhasil diperbarui (90x90 WebP)");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl(null);
    if (editTarget?.client_id) {
      localStorage.removeItem(`client_avatar_${editTarget.client_id}`);
    }
    toast.success("Foto profil berhasil dihapus");
  };

  async function handleSubmit() {
    if (!fields.client_code.trim() || !fields.customer_name.trim()) {
      toast.error("Kode klien dan nama pelanggan wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      const clientData: ClientInsert = {
        client_code: fields.client_code.trim(),
        customer_name: fields.customer_name.trim(),
        customer_name_alias: fields.customer_name_alias?.trim() || null,
        email: fields.email?.trim() || null,
        phone_number: fields.phone_number?.trim() || null,
        whatsapp_number: fields.whatsapp_number?.trim() || null,
        address: fields.address?.trim() || null,
        city: fields.city?.trim() || null,
        province: fields.province?.trim() || null,
        postal_code: fields.postal_code?.trim() || null,
        notes: fields.notes?.trim() || null,
      };

      if (editTarget) {
        await updateMutation.mutateAsync({
          client_id: editTarget.client_id,
          data: clientData,
        });
        if (avatarUrl) {
          localStorage.setItem(`client_avatar_${editTarget.client_id}`, avatarUrl);
        }
        toast.success("Klien berhasil diperbarui");
        refetch();
        navigate(`/client/${editTarget.client_id}`, { replace: true });
        return;
      } else {
        const created = await createMutation.mutateAsync(clientData);
        if (avatarUrl && created?.client_id) {
          localStorage.setItem(`client_avatar_${created.client_id}`, avatarUrl);
        }
        toast.success("Klien berhasil ditambahkan");
      }

      refetch();
      navigate("/client");
    } catch (err: any) {
      toast.error(err?.message ?? "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Filter products owned by this client
  const clientProducts = React.useMemo(() => {
    if (!editTarget) return [];
    return allProducts.filter((p) => p.current_client_id === editTarget.client_id);
  }, [allProducts, editTarget]);

  const mappedClientProducts = React.useMemo(() => {
    return clientProducts.map((p) => ({
      id: p.product_id,
      ...p,
    }));
  }, [clientProducts]);

  const metrics: MetricCardItem[] = [
    {
      label: "Total Klien",
      value: allClients.length.toLocaleString("id-ID"),
      delta: "5.1%",
      trend: "up",
      colorScheme: "emerald",
      icon: UsersIcon,
      comparisonPeriod: "dari bulan lalu",
    },
    {
      label: "Klien Aktif",
      value: allClients.length.toLocaleString("id-ID"),
      delta: "0%",
      trend: "neutral",
      colorScheme: "blue",
      icon: UsersIcon,
      comparisonPeriod: "dari bulan lalu",
    },
  ];

  const mappedClients = allClients.map((c) => ({
    id: c.client_id,
    ...c,
  }));

  if (loading && allClients.length === 0) {
    return (
      <PageContent>
        <div className="px-4 lg:px-6 space-y-6">
          <div className="h-40 rounded-lg bg-muted animate-pulse" />
        </div>
      </PageContent>
    );
  }

  if (error) {
    return (
      <PageContent>
        <div className="px-4 lg:px-6 py-10 text-center text-destructive">
          Error: {error}
        </div>
      </PageContent>
    );
  }

  if (isFormActive) {
    if (editTarget && !isEditMode) {
      return (
        <PageContent>
          <ClientViewMode
            client={editTarget}
            avatarUrl={avatarUrl}
            clientProducts={mappedClientProducts}
            clientProductColumns={clientProductColumns}
            onEdit={() => navigate(`/client/${editTarget.client_id}?edit`)}
            onBack={() => navigate("/client")}
            onRowClickProduct={(prodId) => navigate(`/products/${prodId}`)}
            onAvatarChange={handleFileChange}
            onAvatarRemove={handleRemoveAvatar}
            fileInputRef={fileInputRef}
          />
        </PageContent>
      );
    }

    return (
      <PageContent>
        <ClientEditMode
          editTarget={editTarget}
          fields={fields}
          setField={setField}
          avatarUrl={avatarUrl}
          fileInputRef={fileInputRef}
          handleFileChange={handleFileChange}
          handleRemoveAvatar={handleRemoveAvatar}
          onSubmit={handleSubmit}
          onCancel={() =>
            editTarget
              ? navigate(`/client/${editTarget.client_id}`, { replace: true })
              : navigate("/client")
          }
          isSubmitting={isSubmitting}
        />
      </PageContent>
    );
  }

  return (
    <PageContent>
      <MetricCards items={metrics} />

      <Separator className="my-2" />

      <div className="grid grid-cols-1 gap-4">
        <DataTable
          persistenceKey="clients"
          onRefresh={refetch}
          addButtonLabel="Tambah Klien"
          columns={columns}
          data={mappedClients}
          onAddClick={() => navigate("/client/add")}
          onRowClick={(row) => navigate(`/client/${row.client_id}`)}
          defaultTab="all"
          tabs={[
            { value: "all", label: "Semua Klien", badge: mappedClients.length },
          ]}
        />
      </div>
    </PageContent>
  );
}
