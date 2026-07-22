import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  UsersIcon,
  Loader2Icon,
  PencilIcon,
  UploadIcon,
  Trash2Icon,
  UserIcon,
  MapPinIcon,
  FileTextIcon,
  PackageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useBreadcrumb } from "@/contexts/breadcrumb-context";
import { Button } from "@/components/ui/button";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { MetricCardItem } from "@/types/metrics";
import type { ClientRow, ClientInsert, ProductRow } from "@/types/database";

// ─── Helper: Get Initials ignoring leading company types (PT, CV, UD, etc.) ────

function getClientInitials(name: string): string {
  if (!name || !name.trim()) return "CL";
  const cleaned = name
    .trim()
    .replace(/^(PT\.?|CV\.?|UD\.?|PD\.?|TB\.?|FIRMA)\s+/i, "")
    .trim();
  if (!cleaned) return name.slice(0, 2).toUpperCase();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

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
  const { setBreadcrumb } = useBreadcrumb();

  const isFormActive = location.pathname.endsWith("/add") || !!id;

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

  const handleCancel = () => {
    navigate("/client");
  };

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
    const emptyKontakCount = [
      fields.client_code,
      fields.customer_name_alias,
      fields.customer_name,
      fields.email,
      fields.phone_number,
      fields.whatsapp_number,
    ].filter((val) => !val || !String(val).trim()).length;

    const emptyLokasiCount = [
      fields.address,
      fields.city,
      fields.province,
      fields.postal_code,
    ].filter((val) => !val || !String(val).trim()).length;

    const emptyLainCount = [
      fields.notes,
    ].filter((val) => !val || !String(val).trim()).length;

    return (
      <PageContent>
        <div className="max-w-5xl mx-auto px-4 lg:px-6 w-full space-y-6">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {editTarget ? "Detail Klien" : "Tambah Klien Baru"}
              </h2>
              {editTarget && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  ID: <span className="font-mono">{editTarget.client_id}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                Kembali
              </Button>
            </div>
          </div>

          {/* 1. Client Profile Header with 90x90 Avatar */}
          <div className="flex flex-col sm:flex-row items-center gap-5 bg-card border rounded-2xl p-5 shadow-2xs">
            <div className="relative size-[90px] rounded-full shrink-0 border-2 border-border/80 bg-muted/40 flex items-center justify-center group shadow-sm">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fields.customer_name || "Client Avatar"}
                  className="size-[86px] rounded-full object-cover"
                />
              ) : (
                <div className="size-[86px] rounded-full bg-primary/15 text-primary flex items-center justify-center text-2xl font-bold tracking-wider select-none">
                  {getClientInitials(fields.customer_name)}
                </div>
              )}

              {/* Pencil Icon Button on Bottom-Right */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground shadow-md hover:scale-105 transition-transform cursor-pointer border-2 border-background"
                    title="Ubah foto profil"
                  >
                    <PencilIcon className="size-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 rounded-xl">
                  <DropdownMenuItem
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer gap-2"
                  >
                    <UploadIcon className="size-4" />
                    <span>{avatarUrl ? "Ganti Foto Profil" : "Unggah Foto Profil"}</span>
                  </DropdownMenuItem>
                  {avatarUrl && (
                    <DropdownMenuItem
                      onClick={handleRemoveAvatar}
                      className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                    >
                      <Trash2Icon className="size-4" />
                      <span>Hapus Foto Profil</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="text-xl font-bold tracking-tight text-foreground truncate">
                  {fields.customer_name || "Nama Pelanggan"}
                </h3>
                {fields.customer_name_alias && (
                  <Badge variant="outline" className="text-xs">
                    Alias: {fields.customer_name_alias}
                  </Badge>
                )}
              </div>
              <p className="text-xs font-mono text-muted-foreground mt-1">
                {fields.client_code ? `Kode Klien: ${fields.client_code}` : "Klien Baru"}
              </p>
              <div className="text-xs text-muted-foreground mt-1.5 flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-1">
                {fields.email && <span>📧 {fields.email}</span>}
                {fields.phone_number && <span>📞 {fields.phone_number}</span>}
                {fields.city && (
                  <span>
                    📍 {fields.city}
                    {fields.province ? `, ${fields.province}` : ""}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Form & Actions Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 2. Categorized Inputs using Accordion */}
                <div className="lg:col-span-2 space-y-4">
                  <Accordion
                    type="multiple"
                    defaultValue={[]}
                    className="w-full space-y-3"
                  >
                    {/* Section 1: Kontak (Combines Identitas & Kontak) */}
                    <AccordionItem
                      value="kontak"
                      className="border rounded-2xl px-4 py-1 bg-card shadow-2xs"
                    >
                      <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
                        <div className="flex items-center justify-between w-full mr-2">
                          <div className="flex items-center gap-2 text-foreground">
                            <UserIcon className="size-4 text-primary" />
                            <span>Kontak & Identitas Klien</span>
                          </div>
                          {emptyKontakCount > 0 && (
                            <Badge
                              variant="secondary"
                              className="size-5 rounded-full p-0 flex items-center justify-center text-[10px] font-mono font-bold bg-muted text-muted-foreground border-border/60 shrink-0"
                              title={`${emptyKontakCount} kolom belum diisi`}
                            >
                              {emptyKontakCount}
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-4 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor="client_code">Kode Klien *</Label>
                            <Input
                              id="client_code"
                              value={fields.client_code}
                              onChange={(e) => setField("client_code", e.target.value)}
                              placeholder="CLI-..."
                              disabled={!!editTarget}
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor="customer_name_alias">Nama Alias (Nickname)</Label>
                            <Input
                              id="customer_name_alias"
                              value={fields.customer_name_alias ?? ""}
                              onChange={(e) => setField("customer_name_alias", e.target.value)}
                              placeholder="Alias / Nama Panggilan"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="customer_name">Nama Pelanggan / Perusahaan *</Label>
                          <Input
                            id="customer_name"
                            value={fields.customer_name}
                            onChange={(e) => setField("customer_name", e.target.value)}
                            placeholder="PT Wiraswasta Muda Indonesia"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={fields.email ?? ""}
                            onChange={(e) => setField("email", e.target.value)}
                            placeholder="alamat@email.com"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor="phone_number">No. Telepon</Label>
                            <Input
                              id="phone_number"
                              value={fields.phone_number ?? ""}
                              onChange={(e) => setField("phone_number", e.target.value)}
                              placeholder="08..."
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor="whatsapp_number">No. WhatsApp</Label>
                            <Input
                              id="whatsapp_number"
                              value={fields.whatsapp_number ?? ""}
                              onChange={(e) => setField("whatsapp_number", e.target.value)}
                              placeholder="08..."
                            />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Section 2: Lokasi & Alamat */}
                    <AccordionItem
                      value="lokasi"
                      className="border rounded-2xl px-4 py-1 bg-card shadow-2xs"
                    >
                      <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
                        <div className="flex items-center justify-between w-full mr-2">
                          <div className="flex items-center gap-2 text-foreground">
                            <MapPinIcon className="size-4 text-primary" />
                            <span>Lokasi & Alamat</span>
                          </div>
                          {emptyLokasiCount > 0 && (
                            <Badge
                              variant="secondary"
                              className="size-5 rounded-full p-0 flex items-center justify-center text-[10px] font-mono font-bold bg-muted text-muted-foreground border-border/60 shrink-0"
                              title={`${emptyLokasiCount} kolom belum diisi`}
                            >
                              {emptyLokasiCount}
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-4 space-y-3">
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="address">Alamat Lengkap</Label>
                          <Input
                            id="address"
                            value={fields.address ?? ""}
                            onChange={(e) => setField("address", e.target.value)}
                            placeholder="Jalan, No. Rumah, RT/RW..."
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor="city">Kota</Label>
                            <Input
                              id="city"
                              value={fields.city ?? ""}
                              onChange={(e) => setField("city", e.target.value)}
                              placeholder="Jakarta"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor="province">Provinsi</Label>
                            <Input
                              id="province"
                              value={fields.province ?? ""}
                              onChange={(e) => setField("province", e.target.value)}
                              placeholder="DKI Jakarta"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor="postal_code">Kode Pos</Label>
                            <Input
                              id="postal_code"
                              value={fields.postal_code ?? ""}
                              onChange={(e) => setField("postal_code", e.target.value)}
                              placeholder="12345"
                            />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Section 3: Lain-lain */}
                    <AccordionItem
                      value="lain-lain"
                      className="border rounded-2xl px-4 py-1 bg-card shadow-2xs"
                    >
                      <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
                        <div className="flex items-center justify-between w-full mr-2">
                          <div className="flex items-center gap-2 text-foreground">
                            <FileTextIcon className="size-4 text-primary" />
                            <span>Lain-lain</span>
                          </div>
                          {emptyLainCount > 0 && (
                            <Badge
                              variant="secondary"
                              className="size-5 rounded-full p-0 flex items-center justify-center text-[10px] font-mono font-bold bg-muted text-muted-foreground border-border/60 shrink-0"
                              title={`${emptyLainCount} kolom belum diisi`}
                            >
                              {emptyLainCount}
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-4 space-y-3">
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="notes">Catatan Keterangan</Label>
                          <Input
                            id="notes"
                            value={fields.notes ?? ""}
                            onChange={(e) => setField("notes", e.target.value)}
                            placeholder="Catatan tambahan mengenai klien..."
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>

                {/* Actions Card */}
            <div className="space-y-6">
              <div className="bg-card border rounded-2xl p-5 shadow-2xs space-y-3">
                <Button
                  className="w-full font-semibold rounded-xl"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Perubahan"
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-muted-foreground rounded-xl"
                  onClick={handleCancel}
                >
                  Batal
                </Button>
              </div>
            </div>
          </div>

          {/* 3. Table Produk Milik Klien */}
          {editTarget && (
            <div className="space-y-4 pt-6 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <PackageIcon className="size-5 text-primary" />
                    Daftar Produk Milik Klien
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Produk yang terdaftar dan dimiliki oleh {editTarget.customer_name}
                  </p>
                </div>
                <Badge variant="secondary" className="font-mono text-xs px-2.5 py-1">
                  {clientProducts.length} Produk
                </Badge>
              </div>

              <DataTable
                persistenceKey={`client-products-${editTarget.client_id}`}
                columns={clientProductColumns}
                data={mappedClientProducts}
                addButtonLabel=""
                onAddClick={() => navigate("/products/add")}
                onRowClick={(row) => navigate(`/products/${row.product_id}`)}
                defaultTab="all"
                tabs={[
                  { value: "all", label: "Semua Produk", badge: clientProducts.length },
                ]}
              />
            </div>
          )}
        </div>
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
