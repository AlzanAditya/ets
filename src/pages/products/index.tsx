import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  PackageIcon,
  LandmarkIcon,
  UserCheckIcon,
  HammerIcon,
  PlusIcon,
  Trash2Icon,
  ImageIcon,
  Loader2Icon,
  ZapIcon,
  ShieldCheckIcon,
  MapPinIcon,
  FileTextIcon,
} from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

interface ProductRowWithId extends DataTableRow, ProductWithRelations { }

// ─── Inline Editable Cells for Products ───────────────────────────────────────

function useTouchScrollFriendly() {
  const startPos = React.useRef<{ x: number; y: number } | null>(null);
  const wasDragged = React.useRef(false);

  const onPointerDownCapture = (e: React.PointerEvent) => {
    startPos.current = { x: e.clientX, y: e.clientY };
    wasDragged.current = false;
  };

  const onPointerMoveCapture = (e: React.PointerEvent) => {
    if (!startPos.current) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    // If pointer moved more than 8 pixels, we consider it a scroll/drag
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
      wasDragged.current = true;
    }
  };

  const onPointerUpCapture = (e: React.PointerEvent) => {
    startPos.current = null;
    if (wasDragged.current) {
      e.stopPropagation();
    }
  };

  const onClickCapture = (e: React.MouseEvent) => {
    if (wasDragged.current) {
      e.stopPropagation();
      wasDragged.current = false;
    }
  };

  return {
    onPointerDownCapture,
    onPointerMoveCapture,
    onPointerUpCapture,
    onClickCapture,
  };
}

function InlineCategoryCell({ row }: { row: any }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [newValue, setNewValue] = React.useState(row.original.category || "");
  const { mutateAsync: updateProduct } = useUpdateProductMutation();
  const touchFriendly = useTouchScrollFriendly();

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
            {...touchFriendly}
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
  const touchFriendly = useTouchScrollFriendly();

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
            {...touchFriendly}
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
  const touchFriendly = useTouchScrollFriendly();
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
            {...touchFriendly}
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
  const touchFriendly = useTouchScrollFriendly();
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
            {...touchFriendly}
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
  const { setBreadcrumb } = useBreadcrumb();

  const isFormActive = location.pathname.endsWith("/add") || !!id;

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
  const [isDraftMode, setIsDraftMode] = React.useState(false);
  const [activeDraftId, setActiveDraftId] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState("all");
  const sessionId = React.useMemo(() => safeUUID(), []);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

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

    navigate("/products");
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

  // ── Handle Draft ──────────────────────────────────────────────────────────────
  async function handleDraft() {
    setIsSaving(true);
    try {
      const draftId = activeDraftId ?? safeUUID();

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
      navigate("/products");
    } catch (err: any) {
      toast.error(err?.message ?? "Gagal menyimpan draft");
    } finally {
      setIsSaving(false);
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

  // ─── Form fields section with Accordion ─────────────────────────────────────
  const emptyIdentitasCount = [
    fields.nomor_seri,
    fields.product_code,
    fields.nama_produk,
    fields.category,
    fields.brand,
    fields.tipe_kode,
    fields.tahun_pembuatan,
  ].filter((val) => !val || !String(val).trim()).length;

  const emptySpesifikasiCount = [
    fields.input,
    fields.output,
    fields.frekuensi,
    fields.jumlah_socket,
    fields.range_daya,
  ].filter((val) => !val || !String(val).trim()).length;

  const emptyProteksiCount = [
    fields.soft_fuse_protection,
    fields.hard_fuse_protection,
    fields.ground_output,
  ].filter((val) => !val || !String(val).trim()).length;

  const emptyLokasiStatusCount = [
    fields.status,
    fields.current_branch_id,
    fields.current_client_id,
  ].filter((val) => !val || !String(val).trim()).length;

  const emptyCatatanCount = [
    fields.tambahan_optional,
  ].filter((val) => !val || !String(val).trim()).length;

  const FormFields = (
    <Accordion
      type="multiple"
      defaultValue={[]}
      className="w-full space-y-3"
    >
      {/* Category 1: Identitas Produk */}
      <AccordionItem
        value="identitas"
        className="border rounded-2xl px-4 py-1 bg-card shadow-2xs"
      >
        <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
          <div className="flex items-center justify-between w-full mr-2">
            <div className="flex items-center gap-2 text-foreground">
              <PackageIcon className="size-4 text-primary" />
              <span>Identitas Produk</span>
            </div>
            {emptyIdentitasCount > 0 && (
              <Badge
                variant="secondary"
                className="size-5 rounded-full p-0 flex items-center justify-center text-[10px] font-mono font-bold bg-muted text-muted-foreground border-border/60 shrink-0"
                title={`${emptyIdentitasCount} kolom belum diisi`}
              >
                {emptyIdentitasCount}
              </Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-2 pb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        </AccordionContent>
      </AccordionItem>

      {/* Category 2: Spesifikasi Elektrikal */}
      <AccordionItem
        value="spesifikasi"
        className="border rounded-2xl px-4 py-1 bg-card shadow-2xs"
      >
        <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
          <div className="flex items-center justify-between w-full mr-2">
            <div className="flex items-center gap-2 text-foreground">
              <ZapIcon className="size-4 text-primary" />
              <span>Spesifikasi Elektrikal</span>
            </div>
            {emptySpesifikasiCount > 0 && (
              <Badge
                variant="secondary"
                className="size-5 rounded-full p-0 flex items-center justify-center text-[10px] font-mono font-bold bg-muted text-muted-foreground border-border/60 shrink-0"
                title={`${emptySpesifikasiCount} kolom belum diisi`}
              >
                {emptySpesifikasiCount}
              </Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-2 pb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        </AccordionContent>
      </AccordionItem>

      {/* Category 3: Proteksi */}
      <AccordionItem
        value="proteksi"
        className="border rounded-2xl px-4 py-1 bg-card shadow-2xs"
      >
        <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
          <div className="flex items-center justify-between w-full mr-2">
            <div className="flex items-center gap-2 text-foreground">
              <ShieldCheckIcon className="size-4 text-primary" />
              <span>Proteksi</span>
            </div>
            {emptyProteksiCount > 0 && (
              <Badge
                variant="secondary"
                className="size-5 rounded-full p-0 flex items-center justify-center text-[10px] font-mono font-bold bg-muted text-muted-foreground border-border/60 shrink-0"
                title={`${emptyProteksiCount} kolom belum diisi`}
              >
                {emptyProteksiCount}
              </Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-2 pb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        </AccordionContent>
      </AccordionItem>

      {/* Category 4: Lokasi & Status */}
      <AccordionItem
        value="lokasi-status"
        className="border rounded-2xl px-4 py-1 bg-card shadow-2xs"
      >
        <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
          <div className="flex items-center justify-between w-full mr-2">
            <div className="flex items-center gap-2 text-foreground">
              <MapPinIcon className="size-4 text-primary" />
              <span>Lokasi & Status</span>
            </div>
            {emptyLokasiStatusCount > 0 && (
              <Badge
                variant="secondary"
                className="size-5 rounded-full p-0 flex items-center justify-center text-[10px] font-mono font-bold bg-muted text-muted-foreground border-border/60 shrink-0"
                title={`${emptyLokasiStatusCount} kolom belum diisi`}
              >
                {emptyLokasiStatusCount}
              </Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-2 pb-4 space-y-3">
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
        </AccordionContent>
      </AccordionItem>

      {/* Category 5: Catatan Tambahan */}
      <AccordionItem
        value="catatan"
        className="border rounded-2xl px-4 py-1 bg-card shadow-2xs"
      >
        <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
          <div className="flex items-center justify-between w-full mr-2">
            <div className="flex items-center gap-2 text-foreground">
              <FileTextIcon className="size-4 text-primary" />
              <span>Catatan Tambahan</span>
            </div>
            {emptyCatatanCount > 0 && (
              <Badge
                variant="secondary"
                className="size-5 rounded-full p-0 flex items-center justify-center text-[10px] font-mono font-bold bg-muted text-muted-foreground border-border/60 shrink-0"
                title={`${emptyCatatanCount} kolom belum diisi`}
              >
                {emptyCatatanCount}
              </Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-2 pb-4 space-y-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tambahan_optional">Keterangan Opsional</Label>
            <Input
              id="tambahan_optional"
              value={fields.tambahan_optional}
              onChange={(e) => setField("tambahan_optional", e.target.value)}
              placeholder="Info tambahan..."
            />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  if (isFormActive) {
    return (
      <PageContent>
        <div className="max-w-4xl mx-auto px-4 lg:px-6 w-full space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                {editTarget
                  ? "Detail Produk"
                  : isDraftMode
                    ? "Edit Draft"
                    : "Tambah Produk Baru"}
              </h2>
              {editTarget && (
                <p className="text-xs text-muted-foreground mt-1">
                  SN: {editTarget.nomor_seri}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
              >
                Kembali
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {FormFields}
            </div>

            <div className="space-y-6">
              {/* Photo upload gallery card */}
              <div className="bg-card border rounded-lg p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Foto ({drawerImages.length})
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="h-7 gap-1.5 text-xs"
                  >
                    {uploading ? (
                      <Loader2Icon className="size-3 animate-spin" />
                    ) : (
                      <PlusIcon className="size-3" />
                    )}
                    Tambah Foto
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={handleFileSelect}
                  />
                </div>

                {drawerImages.length === 0 ? (
                  <div className="flex h-24 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-muted-foreground">
                    <ImageIcon className="size-6 opacity-50" />
                    <span className="text-xs">Belum ada foto</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {drawerImages.map((img, index) => (
                      <div
                        key={img.storagePath}
                        className="group relative aspect-square overflow-hidden rounded-md border bg-muted"
                      >
                        <img
                          src={img.previewUrl ?? img.thumbUrl ?? ""}
                          alt={`Foto ${index + 1}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(index)}
                          className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                          aria-label="Hapus foto"
                        >
                          <Trash2Icon className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons Card */}
              <div className="bg-card border rounded-lg p-6 shadow-sm space-y-3">
                <Button
                  className="w-full"
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
                {!editTarget && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleDraft}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
                        Menyimpan Draft...
                      </>
                    ) : (
                      "Simpan sebagai Draft"
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="w-full text-destructive hover:bg-destructive/10"
                  onClick={handleCancel}
                >
                  Batal
                </Button>
              </div>
            </div>
          </div>
        </div>
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
