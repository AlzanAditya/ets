import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  PackageIcon,
  LandmarkIcon,
  UserCheckIcon,
  HammerIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { ProductViewMode } from "./components/product-view-mode";
import { ProductEditMode } from "./components/product-edit-mode";
import { addActivityLog } from "./components/product-activity-timeline";
import { useBreadcrumb } from "@/contexts/breadcrumb-context";
import { optimizeImage } from "@/lib/image-optimizer";
import { getSignedUrls, cleanupTempSession, uploadImagePair } from "@/lib/image-service";

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
import { type DrawerImage } from "@/components/table-drawer";
import { MetricCards } from "@/components/metric-cards";
import { PageContent } from "@/components/page-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MetricCardItem } from "@/types/metrics";
import type { ProductWithRelations } from "@/services/products.service";
import { productsService } from "@/services/products.service";
import type {
  ProductInsert,
  ProductRow,
  ProductImageRow,
} from "@/types/database";
import {
  moveDraftToProduct,
  deleteFiles,
} from "@/lib/image-service";

// ─── Constants ────────────────────────────────────────────────────────────────

const DRAFT_STORAGE_KEY = "draft_products_v2";

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

interface ProductRowWithId extends DataTableRow, ProductWithRelations { }

// ─── Inline Editable Cells for Products ───────────────────────────────────────

function useTouchTap(onTap: () => void) {
  const startPosRef = React.useRef<{ x: number; y: number } | null>(null);
  const isSwipingRef = React.useRef(false);

  const onPointerDown = React.useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "touch") {
      e.preventDefault();
    }
  }, []);

  const onTouchStart = React.useCallback((e: React.TouchEvent) => {
    if (e.touches && e.touches[0]) {
      startPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      isSwipingRef.current = false;
    }
  }, []);

  const onTouchMove = React.useCallback((e: React.TouchEvent) => {
    if (startPosRef.current && e.touches && e.touches[0]) {
      const dx = Math.abs(e.touches[0].clientX - startPosRef.current.x);
      const dy = Math.abs(e.touches[0].clientY - startPosRef.current.y);
      if (dx > 8 || dy > 8) {
        isSwipingRef.current = true;
      }
    }
  }, []);

  const onTouchEnd = React.useCallback((e: React.TouchEvent) => {
    if (startPosRef.current && !isSwipingRef.current && e.changedTouches && e.changedTouches[0]) {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const dist = Math.hypot(endX - startPosRef.current.x, endY - startPosRef.current.y);
      if (dist <= 8) {
        onTap();
      }
    }
    startPosRef.current = null;
    isSwipingRef.current = false;
  }, [onTap]);

  return {
    onPointerDown,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}

function InlineCategoryCell({ row }: { row: any }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [newValue, setNewValue] = React.useState(row.original.category || "");
  const { mutateAsync: updateProduct } = useUpdateProductMutation();
  const touchHandlers = useTouchTap(() => setIsOpen((prev) => !prev));

  const handleSave = async (val: string) => {
    try {
      await updateProduct({
        product_id: row.original.product_id,
        data: { category: val || null },
      });
      toast.success(`Kategori diperbarui ke "${val || "General"}"`);
      setIsOpen(false);
    } catch (err) {
      toast.error("Gagal memperbarui kategori");
    }
  };

  const categories = ["General", "Premium", "Standard", "Sparepart", "Custom"];

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <button
            {...touchHandlers}
            className="text-left font-medium hover:bg-accent hover:text-accent-foreground px-1.5 py-0.5 rounded transition-colors cursor-pointer text-xs"
          >
            <Badge variant="outline" className="text-muted-foreground select-none pointer-events-none">
              {row.original.category || "General"}
            </Badge>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48 p-2">
          <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground px-2 py-1">Pilih Kategori</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {categories.map((cat) => (
            <DropdownMenuItem
              key={cat}
              onClick={() => handleSave(cat)}
              className="text-xs cursor-pointer"
            >
              {cat}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <div className="flex gap-1 p-1">
            <Input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Kategori baru..."
              className="h-7 text-xs px-2 flex-1"
            />
            <Button
              size="sm"
              className="h-7 text-[10px] px-2 cursor-pointer"
              onClick={() => handleSave(newValue)}
            >
              Simpan
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function InlineStatusCell({ row }: { row: any }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const { mutateAsync: updateProduct } = useUpdateProductMutation();
  const touchHandlers = useTouchTap(() => setIsOpen((prev) => !prev));

  const handleSave = async (val: any) => {
    try {
      await updateProduct({
        product_id: row.original.product_id,
        data: { status: val },
      });
      toast.success(`Status diperbarui`);
      setIsOpen(false);
    } catch (err) {
      toast.error("Gagal memperbarui status");
    }
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <button
            {...touchHandlers}
            className="text-left font-medium hover:bg-accent hover:text-accent-foreground px-1.5 py-0.5 rounded transition-colors cursor-pointer text-xs"
          >
            <Badge
              variant="outline"
              className={cn("select-none pointer-events-none", STATUS_COLORS[row.original.status] ?? "")}
            >
              {STATUS_LABELS[row.original.status] ?? row.original.status}
            </Badge>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground">Ubah Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {STATUS_OPTIONS.map((statusVal) => (
            <DropdownMenuItem
              key={statusVal}
              onClick={() => handleSave(statusVal)}
              className="text-xs cursor-pointer flex items-center justify-between"
            >
              <span>{STATUS_LABELS[statusVal] ?? statusVal}</span>
              {row.original.status === statusVal && (
                <div className="size-1.5 rounded-full bg-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function InlineBranchCell({ row }: { row: any }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const { data: branches = [] } = useBranches();
  const { mutateAsync: updateProduct } = useUpdateProductMutation();
  const touchHandlers = useTouchTap(() => setIsOpen((prev) => !prev));
  const branch = row.original.branch;

  const handleSave = async (branchId: string | null) => {
    try {
      await updateProduct({
        product_id: row.original.product_id,
        data: { current_branch_id: branchId },
      });
      toast.success("Lokasi cabang berhasil diperbarui");
      setIsOpen(false);
    } catch (err) {
      toast.error("Gagal memperbarui cabang");
    }
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <button
            {...touchHandlers}
            className="text-left hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded transition-colors cursor-pointer flex items-center w-full min-w-[120px]"
          >
            {branch ? (
              <span className="text-xs text-foreground flex items-center gap-1.5 select-none pointer-events-none">
                <LandmarkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                {branch.branch_name}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground select-none pointer-events-none">— Tentukan Cabang</span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 max-h-64 overflow-y-auto">
          <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground">Pilih Cabang</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => handleSave(null)}
            className="text-xs cursor-pointer italic text-muted-foreground"
          >
            Kosongkan Cabang
          </DropdownMenuItem>
          {branches.map((b) => (
            <DropdownMenuItem
              key={b.branch_id}
              onClick={() => handleSave(b.branch_id)}
              className="text-xs cursor-pointer flex items-center justify-between"
            >
              <span className="truncate">{b.branch_name}</span>
              {row.original.current_branch_id === b.branch_id && (
                <div className="size-1.5 rounded-full bg-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function InlineClientCell({ row }: { row: any }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const { data: clients = [] } = useClients();
  const { mutateAsync: updateProduct } = useUpdateProductMutation();
  const touchHandlers = useTouchTap(() => setIsOpen((prev) => !prev));
  const client = row.original.client;

  const handleSave = async (clientId: string | null) => {
    try {
      await updateProduct({
        product_id: row.original.product_id,
        data: { current_client_id: clientId },
      });
      toast.success("Klien pemegang berhasil diperbarui");
      setIsOpen(false);
    } catch (err) {
      toast.error("Gagal memperbarui klien");
    }
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <button
            {...touchHandlers}
            className="text-left hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded transition-colors cursor-pointer flex items-center w-full min-w-[120px]"
          >
            {client ? (
              <span className="text-xs text-primary font-medium flex items-center gap-1.5 select-none pointer-events-none font-semibold">
                <UserCheckIcon className="h-3.5 w-3.5" />
                {client.customer_name}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground select-none pointer-events-none">— Tentukan Klien</span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 max-h-64 overflow-y-auto">
          <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground">Pilih Klien Pemegang</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => handleSave(null)}
            className="text-xs cursor-pointer italic text-muted-foreground"
          >
            Kosongkan Klien
          </DropdownMenuItem>
          {clients.map((c) => (
            <DropdownMenuItem
              key={c.client_id}
              onClick={() => handleSave(c.client_id)}
              className="text-xs cursor-pointer flex items-center justify-between"
            >
              <span className="truncate">{c.customer_name}</span>
              {row.original.current_client_id === c.client_id && (
                <div className="size-1.5 rounded-full bg-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

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
    cell: ({ row }) => <InlineCategoryCell row={row} />,
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
    cell: ({ row }) => <InlineBranchCell row={row} />,
  },
  {
    id: "holder",
    header: "Klien Pemegang",
    cell: ({ row }) => <InlineClientCell row={row} />,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <InlineStatusCell row={row} />,
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

export default function ProductsPage() {
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

  const { data: allProducts = [], loading, error, refetch } = useProducts();
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
  const { data: branches = [] } = useBranches();
  const { data: clients = [] } = useClients();
  const createMutation = useCreateProductMutation();
  const updateMutation = useUpdateProductMutation();

  // ── Drafts ────────────────────────────────────────────────────────────────────
  const [drafts, setDrafts] = React.useState<ProductDraft[]>(loadDrafts);

  // ── Form / Edit state ─────────────────────────────────────────────────────────
  const [editTarget, setEditTarget] =
    React.useState<ProductWithRelations | null>(null);
  const [, setIsDraftMode] = React.useState(false);
  const [activeDraftId, setActiveDraftId] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState("all");
  const sessionId = React.useMemo(() => safeUUID(), []);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // ── Form fields (controlled) ──────────────────────────────────────────────────
  const [fields, setFields] = React.useState<ProductDraftFields>(emptyFields());
  const [drawerImages, setDrawerImages] = React.useState<DrawerImage[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function setField<K extends keyof ProductDraftFields>(
    key: K,
    value: ProductDraftFields[K],
  ) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  // ── Route and Breadcrumb Synchronization ─────────────────────────────────────
  React.useEffect(() => {
    if (!isFormActive) {
      setBreadcrumb(null, null);
      setEditTarget(null);
      setIsDraftMode(false);
      setActiveDraftId(null);
      return;
    }

    if (location.pathname.endsWith("/products/add") || location.pathname.endsWith("/add")) {
      setBreadcrumb("Add", null);
      setFields(emptyFields());
      setDrawerImages([]);
      setEditTarget(null);
      setIsDraftMode(false);
      setActiveDraftId(null);
    } else if (id) {
      // Check drafts first
      const draft = drafts.find((d) => d.draftId === id);
      if (draft) {
        setBreadcrumb(draft.fields.nama_produk || "Draft Baru", draft.draftId);
        setEditTarget(null);
        setIsDraftMode(true);
        setActiveDraftId(draft.draftId);
        setFields(draft.fields);
        setDrawerImages(draft.imagePaths.map((p) => ({
          id: null,
          storagePath: p.storagePath,
          thumbPath: p.thumbPath,
          sortOrder: p.sortOrder,
        })));
      } else {
        // Check products from database
        const product = allProducts.find((p) => p.product_id === id);
        if (product) {
          setBreadcrumb(product.nama_produk, product.nomor_seri);
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
          setDrawerImages((product.images ?? []).map((img) => ({
            id: img.id,
            storagePath: img.storage_path,
            thumbPath: img.thumbnail_path ?? img.storage_path,
            sortOrder: img.sort_order,
          })));
        } else if (!loading && allProducts.length > 0) {
          // Fallback if not found in db and not loading
          navigate("/products");
        }
      }
    }
  }, [id, location.pathname, isFormActive, allProducts, loading, drafts, setBreadcrumb, navigate]);

  // ── Load signed URLs for images ──────────────────────────────────────────────
  React.useEffect(() => {
    if (!isFormActive) return;

    const paths = drawerImages
      .filter((img) => img.thumbPath && !img.thumbUrl)
      .map((img) => img.thumbPath);

    if (paths.length === 0) return;

    getSignedUrls(paths)
      .then((urlMap) => {
        setDrawerImages((prev) =>
          prev.map((img) =>
            img.thumbPath && urlMap[img.thumbPath]
              ? { ...img, thumbUrl: urlMap[img.thumbPath] }
              : img
          )
        );
      })
      .catch(console.error);
  }, [isFormActive, drawerImages.length]);

  // ── Handle image file selection ──────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    e.target.value = "";
    setUploading(true);
    try {
      await Promise.all(
        files.map(async (file) => {
          const optimized = await optimizeImage(file);
          const prefix = `uploads/temp/${sessionId}`;
          const paths = await uploadImagePair(
            optimized.full,
            optimized.thumb,
            prefix,
          );

          const newImage: DrawerImage = {
            id: null,
            storagePath: paths.fullPath,
            thumbPath: paths.thumbPath,
            previewUrl: optimized.previewUrl,
            sortOrder: drawerImages.length,
          };

          setDrawerImages((prev) => [...prev, { ...newImage, sortOrder: prev.length }]);
        })
      );
    } catch (err) {
      console.error("Image upload failed:", err);
      toast.error("Gagal mengunggah foto");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (index: number) => {
    const img = drawerImages[index];
    if (img.previewUrl) {
      URL.revokeObjectURL(img.previewUrl);
    }
    try {
      await deleteFiles([img.storagePath, img.thumbPath].filter(Boolean));
    } catch (err) {
      console.error("Failed to delete image:", err);
    }
    setDrawerImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.map((img, i) => ({ ...img, sortOrder: i }));
    });
  };

  const handleCancel = async () => {
    drawerImages.forEach((img) => {
      if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
    });

    const tempPaths = drawerImages
      .filter((img) => img.id === null)
      .flatMap((img) => [img.storagePath, img.thumbPath].filter(Boolean));

    if (tempPaths.length > 0) {
      try {
        await cleanupTempSession(sessionId);
      } catch (err) {
        console.error("Temp session cleanup failed:", err);
      }
    }

    if (editTarget) {
      navigate(`/products/${editTarget.product_id}`, { replace: true });
    } else {
      navigate("/products");
    }
  };

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
              sort_order: i,
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

        addActivityLog(
          editTarget.product_id,
          {
            activity: "Informasi Diperbarui",
            performer: "System Admin",
            notes: "Pembaruan data spesifikasi & identitas produk via Detail Edit Mode",
            type: "update",
            timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
          },
          editTarget
        );

        toast.success("Produk berhasil diperbarui");
        refetch();
        navigate(`/products/${editTarget.product_id}`, { replace: true });
        return;
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

          await productsService.addProductImages(
            finalPairs.map((p, i) => ({
              product_id: created.product_id,
              storage_path: p.fullPath,
              thumbnail_path: p.thumbPath,
              mime_type: "image/webp",
              sort_order: i,
              uploaded_by: null,
              width: null,
              height: null,
              file_name: null,
              file_size: null,
            })),
          );
        }

        if (activeDraftId) {
          const next = drafts.filter((d) => d.draftId !== activeDraftId);
          setDrafts(next);
          saveDrafts(next);
        }

        toast.success("Produk berhasil ditambahkan");
      }

      refetch();
      navigate("/products");
    } catch (err: any) {
      toast.error(err?.message ?? "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading && allProducts.length === 0) {
    return (
      <PageContent>
        <div className="px-4 lg:px-6 space-y-6">
          <TableSkeleton columnCount={6} rowCount={8} />
        </div>
      </PageContent>
    );
  }

  if (error) {
    return (
      <PageContent>
        <div className="px-4 lg:px-6">
          <ErrorState message={error} onRetry={refetch} />
        </div>
      </PageContent>
    );
  }

  const metrics: MetricCardItem[] = [
    {
      label: "Total Katalog",
      value: totalCount.toLocaleString("id-ID"),
      delta: "+0%",
      trend: "up",
      summary: "Semua aset terdaftar",
      description: "Tidak termasuk retired",
      icon: PackageIcon,
    },
    {
      label: "Stock",
      value: activeCount.toLocaleString("id-ID"),
      delta: "+0%",
      trend: "up",
      summary: "Ready untuk dideploy",
      description: "Tersimpan di cabang/gudang",
      icon: LandmarkIcon,
    },
    {
      label: "Terjual",
      value: deployedCount.toLocaleString("id-ID"),
      delta: "+0%",
      trend: "up",
      summary: "Tersewa/dipinjamkan",
      description: "Dalam operasional klien",
      icon: UserCheckIcon,
    },
    {
      label: "Diservis",
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

  if (isFormActive) {
    if (editTarget && !isEditMode) {
      return (
        <PageContent>
          <ProductViewMode
            product={editTarget}
            onEdit={() => navigate(`/products/${editTarget.product_id}?edit`)}
            onBack={() => navigate("/products")}
            signedImages={drawerImages.map((img) => ({
              storagePath: img.storagePath,
              thumbUrl: img.thumbUrl ?? img.previewUrl,
              fullUrl: img.thumbUrl ?? img.previewUrl,
            }))}
          />
        </PageContent>
      );
    }

    return (
      <PageContent>
        <ProductEditMode
          editTarget={editTarget}
          fields={fields}
          setField={setField}
          branches={branches}
          clients={clients}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          drawerImages={drawerImages}
          handleFileSelect={handleFileSelect}
          handleDeleteImage={handleDeleteImage}
          uploading={uploading}
          fileInputRef={fileInputRef}
        />
      </PageContent>
    );
  }

  return (
    <PageContent>
      <MetricCards items={metrics} />

      {allProducts.length === 0 && drafts.length === 0 ? (
        <div className="px-4 lg:px-6">
          <EmptyState
            title="Katalog Produk Kosong"
            description="Belum ada aset terdaftar di sistem. Mulai tambahkan aset baru."
            actionLabel="Tambah Aset Baru"
            onAction={() => navigate("/products/add")}
          />
        </div>
      ) : (
        <DataTable
          persistenceKey="products"
          onRefresh={refetch}
          addButtonLabel="Tambah"
          columns={columns}
          data={filteredProducts}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onAddClick={() => navigate("/products/add")}
          onRowClick={(row) => {
            if (activeTab === "draft") {
              navigate(`/products/${row.id}`);
            } else {
              navigate(`/products/${row.product_id}`);
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
