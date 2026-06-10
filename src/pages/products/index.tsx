import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  PackageIcon,
  LandmarkIcon,
  UserCheckIcon,
  HammerIcon,
} from "lucide-react";
import { toast } from "sonner";

import { useProducts } from "@/hooks/use-products";
import { useProductCount } from "@/hooks/use-products";
import {
  useCreateProductMutation,
  useUpdateProductMutation,
} from "@/hooks/use-products";
import { useBranches } from "@/hooks/use-branches";
import { useClients } from "@/hooks/use-clients";
import { useTableSchema } from "@/hooks/use-table-schema";
import { mergeDynamicColumns } from "@/lib/dynamic-columns";
import { supabase } from "@/lib/supabase";
import { safeUUID } from "@/lib/utils";
import { TableSkeleton } from "@/components/table-skeleton";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import { DataTable, type DataTableRow } from "@/components/data-table";
import { DataTableRowActions } from "@/components/data-table-actions";
import { TableDrawer, type DrawerImage } from "@/components/table-drawer";
import { MetricCards } from "@/components/metric-cards";
import { PageContent } from "@/components/page-content";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MetricCardItem } from "@/types/metrics";
import type { ProductWithRelations } from "@/services/products.service";
import { productsService } from "@/services/products.service";
import type {
  ProductInsert,
  ProductRow,
  ProductImageRow,
} from "@/types/database";
import {
  moveTempToDraft,
  moveDraftToProduct,
  cleanupDraft,
  deleteFiles,
} from "@/lib/image-service";

// ─── Constants ────────────────────────────────────────────────────────────────

const DRAFT_STORAGE_KEY = "draft_products_v2";
const NO_SELECTION_VALUE = "__none__";

const STATUS_OPTIONS: ProductRow["status"][] = [
  "active",
  "deployed",
  "sold",
  "maintenance",
  "inactive",
  "retired",
];
const STATUS_LABELS: Record<string, string> = {
  active: "Aktif (Gudang)",
  deployed: "Terpasang (Klien)",
  sold: "Terjual",
  maintenance: "Servis",
  inactive: "Nonaktif",
  retired: "Pensiun",
};
const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  deployed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  sold: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  maintenance: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  inactive: "bg-muted text-muted-foreground border-transparent",
  retired: "bg-muted text-muted-foreground border-transparent",
};

// ─── Draft Types ──────────────────────────────────────────────────────────────

interface ProductDraftFields {
  nomor_seri: string;
  product_code: string;
  nama_produk: string;
  category: string;
  brand: string;
  tipe_kode: string;
  tahun_pembuatan: string;
  input: string;
  output: string;
  frekuensi: string;
  jumlah_socket: string;
  range_daya: string;
  soft_fuse_protection: string;
  hard_fuse_protection: string;
  ground_output: string;
  tambahan_optional: string;
  current_branch_id: string;
  current_client_id: string;
  status: ProductRow["status"];
}

interface ProductDraft {
  draftId: string;
  createdAt: string;
  fields: ProductDraftFields;
  /** Storage paths only — no Base64 */
  imagePaths: Array<{
    storagePath: string;
    thumbPath: string;
    sortOrder: number;
  }>;
}

function loadDrafts(): ProductDraft[] {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDrafts(drafts: ProductDraft[]): void {
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
}

function emptyFields(): ProductDraftFields {
  return {
    nomor_seri: "",
    product_code: "",
    nama_produk: "",
    category: "",
    brand: "",
    tipe_kode: "",
    tahun_pembuatan: "",
    input: "",
    output: "",
    frekuensi: "",
    jumlah_socket: "",
    range_daya: "",
    soft_fuse_protection: "",
    hard_fuse_protection: "",
    ground_output: "",
    tambahan_optional: "",
    current_branch_id: "",
    current_client_id: "",
    status: "active",
  };
}

// ─── Row Type ─────────────────────────────────────────────────────────────────

interface ProductRowWithId extends DataTableRow, ProductWithRelations {}

// ─── Pinned Columns (rich renderers — always shown first) ─────────────────────
// Any DB column not listed here will be auto-added to the Columns dropdown.

const PINNED_COLUMNS: ColumnDef<ProductRowWithId>[] = [
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
    cell: ({ row }) => (
      <span className="font-medium">{row.original.nama_produk}</span>
    ),
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
    accessorKey: "brand",
    header: "Brand",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.brand || "—"}
      </span>
    ),
  },
  {
    id: "location",
    header: "Lokasi Gudang/Cabang",
    cell: ({ row }) => {
      const branch = row.original.branch;
      return branch ? (
        <span className="text-sm text-foreground flex items-center gap-1.5">
          <LandmarkIcon className="h-3.5 w-3.5 text-muted-foreground" />
          {branch.branch_name}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      );
    },
  },
  {
    id: "holder",
    header: "Klien Pemegang",
    cell: ({ row }) => {
      const client = row.original.client;
      return client ? (
        <span className="text-sm text-foreground flex items-center gap-1.5">
          <UserCheckIcon className="h-3.5 w-3.5 text-muted-foreground" />
          {client.customer_name}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={STATUS_COLORS[row.original.status] ?? ""}
      >
        {STATUS_LABELS[row.original.status] ?? row.original.status}
      </Badge>
    ),
  },
  {
    id: "actions",
    enableHiding: true,
    cell: ({ row }) => {
      // We need refetch from page scope — captured via closure inside ProductsPage.
      // This column is declared outside the component so we use a ref trick via
      // a module-level callback holder updated on each render.
      return (
        <DataTableRowActions
          row={row.original}
          showPreview
          previewUrl={`https://qr.zanxa.studio/p/${row.original.nomor_seri}`}
          onDelete={async (r) => {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (!user) throw new Error("Tidak terautentikasi");
            await productsService.retireProduct((r as any).product_id);
            // refetch is called from the page via the onDelete callback chain;
            // the DataTableRowActions component handles toast + re-fetch signal.
          }}
        />
      );
    },
  },
];

// FK / relational / system columns to exclude from auto-generation.
const EXCLUDED_PRODUCT_COLUMNS = [
  "product_id",           // PK UUID
  "current_branch_id",    // FK — shown via composite "location" column
  "current_client_id",    // FK — shown via composite "holder" column
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const { data: allProducts, loading, error, refetch } = useProducts();
  const { columns: schemaColumns } = useTableSchema("products");

  const columns = React.useMemo(() => {
    return mergeDynamicColumns(
      PINNED_COLUMNS,
      schemaColumns,
      EXCLUDED_PRODUCT_COLUMNS,
    );
  }, [schemaColumns]);

  const { count: totalCount } = useProductCount();
  const { count: activeCount } = useProductCount("active");
  const { count: deployedCount } = useProductCount("deployed");
  const { count: maintenanceCount } = useProductCount("maintenance");
  const { data: branches } = useBranches();
  const { data: clients } = useClients();
  const createMutation = useCreateProductMutation();
  const updateMutation = useUpdateProductMutation();

  // ── Drafts ────────────────────────────────────────────────────────────────────
  const [drafts, setDrafts] = React.useState<ProductDraft[]>(loadDrafts);

  // ── Drawer state ──────────────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editTarget, setEditTarget] =
    React.useState<ProductWithRelations | null>(null);
  const [isDraftMode, setIsDraftMode] = React.useState(false);
  const [activeDraftId, setActiveDraftId] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState("all");
  const sessionId = React.useMemo(() => safeUUID(), []);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  // ── Form fields (controlled) ──────────────────────────────────────────────────
  const [fields, setFields] = React.useState<ProductDraftFields>(emptyFields());
  const [drawerImages, setDrawerImages] = React.useState<DrawerImage[]>([]);

  function setField<K extends keyof ProductDraftFields>(
    key: K,
    value: ProductDraftFields[K],
  ) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  // ── Open drawer for existing row ──────────────────────────────────────────────
  function openForEdit(product: ProductWithRelations) {
    setEditTarget(product);
    setIsDraftMode(false);
    setActiveDraftId(null);
    setFields({
      nomor_seri: product.nomor_seri,
      product_code: product.product_code ?? "",
      nama_produk: product.nama_produk,
      category: product.category ?? "",
      brand: product.brand ?? "",
      tipe_kode: product.tipe_kode ?? "",
      tahun_pembuatan: product.tahun_pembuatan?.toString() ?? "",
      input: product.input ?? "",
      output: product.output ?? "",
      frekuensi: product.frekuensi ?? "",
      jumlah_socket: product.jumlah_socket?.toString() ?? "",
      range_daya: product.range_daya ?? "",
      soft_fuse_protection: product.soft_fuse_protection ?? "",
      hard_fuse_protection: product.hard_fuse_protection ?? "",
      ground_output: product.ground_output ?? "",
      tambahan_optional: product.tambahan_optional ?? "",
      current_branch_id: product.current_branch_id ?? "",
      current_client_id: product.current_client_id ?? "",
      status: product.status,
    });
    // Map DB image records to DrawerImage format
    const imgs: DrawerImage[] = (product.images ?? []).map(
      (img: ProductImageRow) => ({
        id: img.id,
        storagePath: img.storage_path,
        thumbPath: img.thumbnail_path ?? img.storage_path,
        sortOrder: img.sort_order,
      }),
    );
    setDrawerImages(imgs);
    setDrawerOpen(true);
  }

  // ── Open drawer for new product ───────────────────────────────────────────────
  function openForAdd() {
    setEditTarget(null);
    setIsDraftMode(false);
    setActiveDraftId(null);
    setFields(emptyFields());
    setDrawerImages([]);
    setDrawerOpen(true);
  }

  // ── Open a draft for editing ──────────────────────────────────────────────────
  function openDraft(draft: ProductDraft) {
    setEditTarget(null);
    setIsDraftMode(true);
    setActiveDraftId(draft.draftId);
    setFields(draft.fields);
    const imgs: DrawerImage[] = draft.imagePaths.map((p) => ({
      id: null,
      storagePath: p.storagePath,
      thumbPath: p.thumbPath,
      sortOrder: p.sortOrder,
    }));
    setDrawerImages(imgs);
    setDrawerOpen(true);
  }

  // ── Delete draft ──────────────────────────────────────────────────────────────
  // NOTE: Called from the draft tab actions column (future: via context menu).
  // Kept here so cleanupDraft fires when the draft storage is cleared.
  async function deleteDraft(draftId: string) {
    await cleanupDraft(draftId);
    const next = drafts.filter((d) => d.draftId !== draftId);
    setDrafts(next);
    saveDrafts(next);
  }
  void (deleteDraft as unknown); // suppresses TS6133 until wired to UI

  // ── Handle Submit ─────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!fields.nomor_seri.trim() || !fields.nama_produk.trim()) {
      toast.error("Nomor seri dan nama produk wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      const productData: ProductInsert = {
        nomor_seri: fields.nomor_seri.trim(),
        product_code: fields.product_code.trim() || null,
        nama_produk: fields.nama_produk.trim(),
        category: fields.category || null,
        brand: fields.brand || null,
        tipe_kode: fields.tipe_kode || null,
        tahun_pembuatan: fields.tahun_pembuatan
          ? Number(fields.tahun_pembuatan)
          : null,
        input: fields.input || null,
        output: fields.output || null,
        frekuensi: fields.frekuensi || null,
        jumlah_socket: fields.jumlah_socket
          ? Number(fields.jumlah_socket)
          : null,
        range_daya: fields.range_daya || null,
        soft_fuse_protection: fields.soft_fuse_protection || null,
        hard_fuse_protection: fields.hard_fuse_protection || null,
        ground_output: fields.ground_output || null,
        tambahan_optional: fields.tambahan_optional || null,
        current_branch_id: fields.current_branch_id || null,
        current_client_id: fields.current_client_id || null,
        status: fields.status,
      };

      if (editTarget) {
        // ── Edit mode: update product fields ─────────────────────────────────────
        await updateMutation.mutateAsync({
          product_id: editTarget.product_id,
          data: productData,
        });

        // 1. Identify deleted database images and remove them
        const initialDbImages = editTarget.images || [];
        const currentDbImageIds = new Set(
          drawerImages.filter((img) => img.id !== null).map((img) => img.id),
        );
        const deletedDbImages = initialDbImages.filter(
          (img) => !currentDbImageIds.has(img.id),
        );

        for (const img of deletedDbImages) {
          await productsService.deleteProductImage(img.id);
          try {
            await deleteFiles(
              [img.storage_path, img.thumbnail_path].filter(
                Boolean,
              ) as string[],
            );
          } catch (err) {
            console.error("Failed to delete storage file on submit:", err);
          }
        }

        // 2. Finalize newly uploaded images (temp/draft -> product storage & DB)
        const sourceId = activeDraftId ?? sessionId;
        const namespace = activeDraftId ? "draft" : "temp";
        const tempImages = drawerImages.filter((img) => img.id === null);

        let newlyInsertedImages: ProductImageRow[] = [];

        if (tempImages.length > 0) {
          const pairs = tempImages.map((img) => ({
            fullPath: img.storagePath,
            thumbPath: img.thumbPath,
          }));

          const finalPairs = await moveDraftToProduct(
            namespace === "draft" ? sourceId : `temp_${sourceId}`,
            editTarget.product_id,
            pairs,
          );

          newlyInsertedImages = await productsService.addProductImages(
            finalPairs.map((p, i) => ({
              product_id: editTarget.product_id,
              storage_path: p.fullPath,
              thumbnail_path: p.thumbPath,
              mime_type: "image/webp",
              sort_order: i, // temp sort order, we will re-index below
              uploaded_by: null,
              width: null,
              height: null,
              file_name: null,
              file_size: null,
            })),
          );
        }

        // 3. Re-index and update sort_order for all final images
        const allFinalImagesWithIds = drawerImages.map((img) => {
          if (img.id !== null) {
            return img;
          }
          const fileName = img.storagePath.split("/").pop()!;
          const matchedDb = newlyInsertedImages.find((dbImg) =>
            dbImg.storage_path.endsWith(fileName),
          );
          return {
            ...img,
            id: matchedDb ? matchedDb.id : null,
          };
        });

        const validUpdates = allFinalImagesWithIds
          .map((img, index) => ({
            id: img.id,
            sort_order: index,
          }))
          .filter(
            (x): x is { id: string; sort_order: number } => x.id !== null,
          );

        if (validUpdates.length > 0) {
          await productsService.updateImageSortOrder(validUpdates);
        }

        toast.success("Produk berhasil diperbarui");
      } else {
        // ── Add mode: create product then move images ─────────────────────────────
        const created = await createMutation.mutateAsync(productData);

        // Move images from draft or temp to final product path
        const sourceId = activeDraftId ?? sessionId;
        const namespace = activeDraftId ? "draft" : "temp";
        const tempImages = drawerImages.filter((img) => img.id === null);

        if (tempImages.length > 0) {
          const pairs = tempImages.map((img) => ({
            fullPath: img.storagePath,
            thumbPath: img.thumbPath,
          }));

          const finalPairs = await moveDraftToProduct(
            namespace === "draft" ? sourceId : `temp_${sourceId}`,
            created.product_id,
            pairs,
          );

          // Save product_images records to DB
          await productsService.addProductImages(
            finalPairs.map((p, i) => ({
              product_id: created.product_id,
              storage_path: p.fullPath,
              thumbnail_path: p.thumbPath,
              mime_type: "image/webp",
              sort_order: i,
              uploaded_by: null, // TODO: inject auth user id
              width: null,
              height: null,
              file_name: null,
              file_size: null,
            })),
          );
        }

        // Remove draft from localStorage if submitted from draft
        if (activeDraftId) {
          const next = drafts.filter((d) => d.draftId !== activeDraftId);
          setDrafts(next);
          saveDrafts(next);
        }

        toast.success("Produk berhasil ditambahkan");
      }

      setDrawerOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Handle Draft ──────────────────────────────────────────────────────────────
  async function handleDraft() {
    setIsSaving(true);
    try {
      const draftId = activeDraftId ?? safeUUID();

      // Move temp session images to draft namespace
      const tempImages = drawerImages.filter((img) => img.id === null);
      let imagePaths = tempImages.map((img, i) => ({
        storagePath: img.storagePath,
        thumbPath: img.thumbPath,
        sortOrder: i,
      }));

      if (tempImages.length > 0 && !activeDraftId) {
        const pairs = await moveTempToDraft(
          sessionId,
          draftId,
          tempImages.map((img) => ({
            fullPath: img.storagePath,
            thumbPath: img.thumbPath,
          })),
        );
        imagePaths = pairs.map((p, i) => ({
          storagePath: p.fullPath,
          thumbPath: p.thumbPath,
          sortOrder: i,
        }));
      }

      const draft: ProductDraft = {
        draftId,
        createdAt: new Date().toISOString(),
        fields,
        imagePaths,
      };

      const next = [draft, ...drafts.filter((d) => d.draftId !== draftId)];
      setDrafts(next);
      saveDrafts(next);

      toast.success("Draft tersimpan");
      setDrawerOpen(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Gagal menyimpan draft");
    } finally {
      setIsSaving(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

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
    );
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
    );
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
  ];

  const mappedAll: ProductRowWithId[] = allProducts.map((p) => ({
    id: p.product_id,
    ...p,
  }));
  const mappedActive = mappedAll.filter((p) => p.status === "active");
  const mappedDeployed = mappedAll.filter((p) => p.status === "deployed");
  const mappedMaintenance = mappedAll.filter((p) => p.status === "maintenance");
  const mappedDrafts: ProductRowWithId[] = drafts.map((d, i) => ({
    id: d.draftId,
    product_id: d.draftId,
    nomor_seri: d.fields.nomor_seri || `DRAFT-${i + 1}`,
    nama_produk: d.fields.nama_produk || "Draft Baru",
    product_code: d.fields.product_code || null,
    category: d.fields.category || null,
    brand: d.fields.brand || null,
    tipe_kode: d.fields.tipe_kode || null,
    tahun_pembuatan: d.fields.tahun_pembuatan
      ? Number(d.fields.tahun_pembuatan)
      : null,
    input: d.fields.input || null,
    output: d.fields.output || null,
    frekuensi: d.fields.frekuensi || null,
    jumlah_socket: d.fields.jumlah_socket
      ? Number(d.fields.jumlah_socket)
      : null,
    range_daya: d.fields.range_daya || null,
    soft_fuse_protection: d.fields.soft_fuse_protection || null,
    hard_fuse_protection: d.fields.hard_fuse_protection || null,
    ground_output: d.fields.ground_output || null,
    tambahan_optional: d.fields.tambahan_optional || null,
    current_branch_id: d.fields.current_branch_id || null,
    current_client_id: d.fields.current_client_id || null,
    status: d.fields.status,
    branch: null,
    client: null,
    images: [],
    created_at: d.createdAt,
    updated_at: d.createdAt,
  }));

  // NOTE: plain variable — no useMemo here because this runs after early returns
  // (useMemo after conditional returns violates Rules of Hooks)
  const filteredProducts: ProductRowWithId[] =
    activeTab === "active"
      ? mappedActive
      : activeTab === "deployed"
        ? mappedDeployed
        : activeTab === "maintenance"
          ? mappedMaintenance
          : activeTab === "draft"
            ? mappedDrafts
            : mappedAll;

  // ─── Form fields section (passed to drawer as children) ───────────────────────
  const FormFields = (
    <div className="flex flex-col gap-4 text-sm">
      {/* Group: Identitas */}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Identitas Produk
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nomor_seri">Nomor Seri *</Label>
          <Input
            id="nomor_seri"
            value={fields.nomor_seri}
            onChange={(e) => setField("nomor_seri", e.target.value)}
            placeholder="SN-..."
            disabled={!!editTarget}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="product_code">Kode Produk</Label>
          <Input
            id="product_code"
            value={fields.product_code}
            onChange={(e) => setField("product_code", e.target.value)}
            placeholder="PRD-..."
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nama_produk">Nama Produk *</Label>
        <Input
          id="nama_produk"
          value={fields.nama_produk}
          onChange={(e) => setField("nama_produk", e.target.value)}
          placeholder="Nama lengkap produk"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category">Kategori</Label>
          <Input
            id="category"
            value={fields.category}
            onChange={(e) => setField("category", e.target.value)}
            placeholder="e.g. UPS, Stabilizer"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="brand">Brand</Label>
          <Input
            id="brand"
            value={fields.brand}
            onChange={(e) => setField("brand", e.target.value)}
            placeholder="e.g. Liebert, APC"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tipe_kode">Tipe / Kode Model</Label>
          <Input
            id="tipe_kode"
            value={fields.tipe_kode}
            onChange={(e) => setField("tipe_kode", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tahun_pembuatan">Tahun Pembuatan</Label>
          <Input
            id="tahun_pembuatan"
            type="number"
            min="1990"
            max="2099"
            value={fields.tahun_pembuatan}
            onChange={(e) => setField("tahun_pembuatan", e.target.value)}
            placeholder="2024"
          />
        </div>
      </div>

      {/* Group: Spesifikasi Elektrikal */}
      <div className="flex flex-col gap-1 pt-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Spesifikasi Elektrikal
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="input">Input</Label>
          <Input
            id="input"
            value={fields.input}
            onChange={(e) => setField("input", e.target.value)}
            placeholder="220V / 1Ph / 50Hz"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="output">Output</Label>
          <Input
            id="output"
            value={fields.output}
            onChange={(e) => setField("output", e.target.value)}
            placeholder="220V / 1Ph / 50Hz"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="frekuensi">Frekuensi</Label>
          <Input
            id="frekuensi"
            value={fields.frekuensi}
            onChange={(e) => setField("frekuensi", e.target.value)}
            placeholder="50 Hz"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="jumlah_socket">Jumlah Socket</Label>
          <Input
            id="jumlah_socket"
            type="number"
            min="0"
            value={fields.jumlah_socket}
            onChange={(e) => setField("jumlah_socket", e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="range_daya">Range Daya</Label>
        <Input
          id="range_daya"
          value={fields.range_daya}
          onChange={(e) => setField("range_daya", e.target.value)}
          placeholder="1000VA – 3000VA"
        />
      </div>

      {/* Group: Proteksi */}
      <div className="flex flex-col gap-1 pt-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Proteksi
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="soft_fuse_protection">Soft Fuse Protection</Label>
          <Input
            id="soft_fuse_protection"
            value={fields.soft_fuse_protection}
            onChange={(e) => setField("soft_fuse_protection", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hard_fuse_protection">Hard Fuse Protection</Label>
          <Input
            id="hard_fuse_protection"
            value={fields.hard_fuse_protection}
            onChange={(e) => setField("hard_fuse_protection", e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ground_output">Ground Output</Label>
        <Input
          id="ground_output"
          value={fields.ground_output}
          onChange={(e) => setField("ground_output", e.target.value)}
        />
      </div>

      {/* Group: Lokasi & Status */}
      <div className="flex flex-col gap-1 pt-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Lokasi & Status
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="status">Status</Label>
        <Select
          value={fields.status}
          onValueChange={(v) => setField("status", v as ProductRow["status"])}
        >
          <SelectTrigger id="status" className="w-full">
            <SelectValue placeholder="Pilih status" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="current_branch_id">Cabang / Gudang</Label>
        <Select
          value={fields.current_branch_id || NO_SELECTION_VALUE}
          onValueChange={(v) =>
            setField("current_branch_id", v === NO_SELECTION_VALUE ? "" : v)
          }
        >
          <SelectTrigger id="current_branch_id" className="w-full">
            <SelectValue placeholder="Pilih cabang" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={NO_SELECTION_VALUE}>— Tidak ada —</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.branch_id} value={b.branch_id}>
                  {b.branch_name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="current_client_id">Klien Pemegang</Label>
        <Select
          value={fields.current_client_id || NO_SELECTION_VALUE}
          onValueChange={(v) =>
            setField("current_client_id", v === NO_SELECTION_VALUE ? "" : v)
          }
        >
          <SelectTrigger id="current_client_id" className="w-full">
            <SelectValue placeholder="Pilih klien" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={NO_SELECTION_VALUE}>— Tidak ada —</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.client_id} value={c.client_id}>
                  {c.customer_name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Group: Catatan */}
      <div className="flex flex-col gap-1 pt-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Catatan Tambahan
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tambahan_optional">Keterangan Opsional</Label>
        <Input
          id="tambahan_optional"
          value={fields.tambahan_optional}
          onChange={(e) => setField("tambahan_optional", e.target.value)}
          placeholder="Info tambahan..."
        />
      </div>
    </div>
  );

  return (
    <PageContent
      description="Kelola seluruh katalog produk, status kepemilikan, lokasi gudang, dan klien."
      eyebrow="Inventory"
      title="Products"
    >
      <MetricCards items={metrics} />

      {/* ── Table Drawer ──────────────────────────────────────────────────────── */}
      <TableDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={
          editTarget
            ? editTarget.nama_produk
            : isDraftMode
              ? "Edit Draft"
              : "Tambah Produk Baru"
        }
        subtitle={editTarget ? `SN: ${editTarget.nomor_seri}` : undefined}
        sessionId={sessionId}
        initialImages={drawerImages}
        onImagesChange={setDrawerImages}
        onSubmit={handleSubmit}
        onDraft={handleDraft}
        showImages={true}
        isSubmitting={isSubmitting}
        isSaving={isSaving}
        isEditMode={!!editTarget}
      >
        {FormFields}
      </TableDrawer>

      {allProducts.length === 0 && drafts.length === 0 ? (
        <div className="px-4 lg:px-6">
          <EmptyState
            title="Katalog Produk Kosong"
            description="Belum ada aset terdaftar di sistem. Mulai tambahkan aset baru."
            actionLabel="Tambah Aset Baru"
            onAction={openForAdd}
          />
        </div>
      ) : (
        <DataTable
          addButtonLabel="Tambah Aset"
          columns={columns}
          data={filteredProducts}
          activeTab={activeTab}
          pageSizeOptions={[10, 20, 50, 100, 150, 200]}
          onTabChange={setActiveTab}
          onAddClick={openForAdd}
          onRowClick={(row) => {
            if (activeTab === "draft") {
              const draft = drafts.find((d) => d.draftId === row.id);
              if (draft) openDraft(draft);
            } else {
              openForEdit(row);
            }
          }}
          tabs={[
            {
              value: "all",
              label: "Semua",
              badge: mappedAll.length,
            },
            {
              value: "active",
              label: "Di Gudang",
              badge: mappedActive.length,
            },
            {
              value: "deployed",
              label: "Di Klien",
              badge: mappedDeployed.length,
            },
            {
              value: "maintenance",
              label: "Maintenance",
              badge: mappedMaintenance.length,
            },
            {
              value: "draft",
              label: "Draft",
              badge: drafts.length,
            },
          ]}
        />
      )}
    </PageContent>
  );
}
