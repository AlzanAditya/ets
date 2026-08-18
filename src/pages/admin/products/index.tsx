import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  PackageIcon,
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
import { useClients } from "@/hooks/use-clients";
import { useTableSchema } from "@/hooks/use-table-schema";
import { mergeDynamicColumns } from "@/lib/dynamic-columns";
import { supabase } from "@/lib/supabase";
import { safeUUID, formatSerialNumber } from "@/lib/utils";
import { TableSkeleton } from "@/components/table-skeleton";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import { DataTable, type DataTableRow } from "@/components/data-table";
import { type DrawerImage } from "@/components/table-drawer";
import { MetricCards } from "@/components/metric-cards";
import { PageContent } from "@/components/page-content";
import { Badge } from "@/components/ui/badge";
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
  ProductStatus,
} from "@/types/database";
import {
  moveDraftToProduct,
  deleteFiles,
} from "@/lib/image-service";

// ─── Constants ────────────────────────────────────────────────────────────────

const DRAFT_STORAGE_KEY = "draft_products_v2";

const STATUS_OPTIONS: ProductRow["status"][] = [
  "warranty",
  "maintenance",
];
const STATUS_LABELS: Record<string, string> = {
  warranty: "Garansi",
  garansi: "Garansi",
  maintenance: "Maintenance",
};
const STATUS_COLORS: Record<string, string> = {
  warranty: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  garansi: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  maintenance: "bg-amber-500/10 text-amber-500 border-amber-500/20",
};

// ─── Draft Types ──────────────────────────────────────────────────────────────

interface ProductDraftFields {
  serial_number: string;
  product_code: string;
  product_name: string;
  model: string;
  model_code: string;
  manufacture_year: string;
  input_voltage: string;
  output_voltage: string;
  frequency: string;
  socket_count: string;
  power_capacity: string;
  soft_fuse: string;
  hard_fuse: string;
  ground_output: string;
  current_branch_id: string;
  current_client_id: string;
  status: ProductStatus;
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
    serial_number: "",
    product_code: "",
    product_name: "",
    model: "",
    model_code: "",
    manufacture_year: "",
    input_voltage: "",
    output_voltage: "",
    frequency: "",
    socket_count: "",
    power_capacity: "",
    soft_fuse: "",
    hard_fuse: "",
    ground_output: "",
    current_branch_id: "",
    current_client_id: "",
    status: "pending",
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
                {client.client_name}
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
              <span className="truncate">{c.client_name}</span>
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
    accessorKey: "serial_number",
    header: "Nomor Seri",
    cell: ({ row }) => (
      <span className="font-mono text-xs font-semibold tracking-wider text-foreground bg-muted px-1.5 py-0.5 rounded">
        {row.original.serial_number}
      </span>
    ),
  },
  {
    accessorKey: "product_name",
    header: "Nama Produk",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.product_name}</span>
    ),
  },
  {
    accessorKey: "model",
    header: "Model",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.model || "—"}
      </span>
    ),
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
  const { count: garansiCount } = useProductCount("warranty");
  const { count: maintenanceCount } = useProductCount("maintenance");
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

    if (location.pathname.endsWith("/products/add") || location.pathname.endsWith("/product/add") || location.pathname.endsWith("/add")) {
      setBreadcrumb("Add", null);
      setFields(emptyFields());
      setDrawerImages([]);
      setEditTarget(null);
      setIsDraftMode(false);
      setActiveDraftId(null);
    } else if (id) {
      const decodedId = decodeURIComponent(id);
      // Check drafts first
      const draft = drafts.find((d) => d.draftId === decodedId || d.draftId === id);
      if (draft) {
        setBreadcrumb(draft.fields.product_name || "Draft Baru", draft.draftId);
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
        // Check products from database by product name (product_name), serial_number (serial_number), or product_id
        const product = allProducts.find(
          (p) =>
            p.product_name === decodedId ||
            (p.product_name && p.product_name.toLowerCase() === decodedId.toLowerCase()) ||
            p.serial_number === decodedId ||
            (p.serial_number && p.serial_number.toLowerCase() === decodedId.toLowerCase()) ||
            p.product_id === decodedId ||
            p.product_id === id
        );
        if (product) {
          setBreadcrumb(product.product_name, product.product_name || product.serial_number);
          setEditTarget(product);
          setIsDraftMode(false);
          setActiveDraftId(null);
          setFields({
            serial_number: product.serial_number,
            product_code: product.product_code ?? "",
            product_name: product.product_name,
            model: product.model ?? "",
            model_code: product.model_code ?? "",
            manufacture_year: product.manufacture_year?.toString() ?? "",
            input_voltage: product.input_voltage ?? "",
            output_voltage: product.output_voltage ?? "",
            frequency: product.frequency ?? "",
            socket_count: product.socket_count?.toString() ?? "",
            power_capacity: product.power_capacity ?? "",
            soft_fuse: product.soft_fuse ?? "",
            hard_fuse: product.hard_fuse ?? "",
            ground_output: product.ground_output ?? "",
            current_branch_id: product.current_branch_id ?? "",
            current_client_id: product.current_client_id ?? "",
            status: product.status,
          });
          setDrawerImages((product.images ?? []).map((img) => ({
            id: img.image_id || img.id || null,
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
      navigate(`/products/${encodeURIComponent(editTarget.serial_number || editTarget.product_name)}`, { replace: true });
    } else {
      navigate("/products");
    }
  };

  // ── Handle Submit ─────────────────────────────────────────────────────────────
  async function handleSubmit() {
    const formattedSerial = formatSerialNumber(fields.serial_number);
    if (!formattedSerial || !fields.product_name.trim()) {
      toast.error("Nomor seri dan nama produk wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      const productData: ProductInsert = {
        serial_number: formattedSerial,
        product_code: fields.product_code.trim() || null,
        product_name: fields.product_name.trim(),
        model: fields.model || null,
        model_code: fields.model_code || null,
        manufacture_year: fields.manufacture_year
          ? Number(fields.manufacture_year)
          : null,
        input_voltage: fields.input_voltage || null,
        output_voltage: fields.output_voltage || null,
        frequency: fields.frequency || null,
        socket_count: fields.socket_count
          ? Number(fields.socket_count)
          : null,
        power_capacity: fields.power_capacity || null,
        soft_fuse: fields.soft_fuse || null,
        hard_fuse: fields.hard_fuse || null,
        ground_output: fields.ground_output || null,
        current_branch_id: fields.current_branch_id || null,
        current_client_id: fields.current_client_id || null,
        ...(editTarget ? { status: editTarget.status } : {}),
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
          (img) => !currentDbImageIds.has(img.image_id || img.id || null),
        );

        for (const img of deletedDbImages) {
          const imgId = img.image_id || img.id;
          if (imgId) {
            await productsService.deleteProductImage(imgId);
          }
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

          let finalPairs: { fullPath: string; thumbPath: string }[] = [];
          try {
            finalPairs = await moveDraftToProduct(
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
              })),
            );
          } catch (imgErr) {
            if (finalPairs.length > 0) {
              const pathsToDelete = finalPairs.flatMap((p) => [p.fullPath, p.thumbPath]);
              await deleteFiles(pathsToDelete).catch(console.error);
            }
            throw imgErr;
          }
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
            id: matchedDb ? (matchedDb.image_id || matchedDb.id || null) : null,
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
        navigate(`/products/${encodeURIComponent(formattedSerial || fields.product_name.trim() || editTarget.serial_number)}`, { replace: true });
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

          let finalPairs: { fullPath: string; thumbPath: string }[] = [];
          try {
            finalPairs = await moveDraftToProduct(
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
              })),
            );
          } catch (imgErr) {
            if (finalPairs.length > 0) {
              const pathsToDelete = finalPairs.flatMap((p) => [p.fullPath, p.thumbPath]);
              await deleteFiles(pathsToDelete).catch(console.error);
            }
            throw imgErr;
          }
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
      description: "Total seluruh produk",
      icon: PackageIcon,
    },
    {
      label: "Garansi",
      value: garansiCount.toLocaleString("id-ID"),
      delta: "+0%",
      trend: "up",
      summary: "Status Garansi",
      description: "Aset berstatus garansi",
      icon: UserCheckIcon,
    },
    {
      label: "Maintenance",
      value: maintenanceCount.toLocaleString("id-ID"),
      delta: "+0%",
      trend: "up",
      summary: "Dalam proses perbaikan",
      description: "Aset berstatus maintenance",
      icon: HammerIcon,
    },
  ];

  const mappedAll: ProductRowWithId[] = allProducts.map((p) => ({
    id: p.product_id,
    ...p,
  }));
  const mappedGaransi = mappedAll.filter((p) => p.status === "warranty" || (p.status as string) === "garansi");
  const mappedMaintenance = mappedAll.filter((p) => p.status === "maintenance");
  const mappedDrafts: ProductRowWithId[] = drafts.map((d, i) => ({
    id: d.draftId,
    product_id: d.draftId,
    serial_number: d.fields.serial_number || `DRAFT-${i + 1}`,
    product_name: d.fields.product_name || "Draft Baru",
    product_code: d.fields.product_code || null,
    model: d.fields.model || null,
    model_code: d.fields.model_code || null,
    manufacture_year: d.fields.manufacture_year
      ? Number(d.fields.manufacture_year)
      : null,
    input_voltage: d.fields.input_voltage || null,
    output_voltage: d.fields.output_voltage || null,
    frequency: d.fields.frequency || null,
    socket_count: d.fields.socket_count
      ? Number(d.fields.socket_count)
      : null,
    power_capacity: d.fields.power_capacity || null,
    soft_fuse: d.fields.soft_fuse || null,
    hard_fuse: d.fields.hard_fuse || null,
    ground_output: d.fields.ground_output || null,
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
    activeTab === "garansi" || activeTab === "warranty"
      ? mappedGaransi
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
            onEdit={() => navigate(`/products/${encodeURIComponent(editTarget.serial_number || editTarget.product_name)}?edit`)}
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
          onDeleteRow={async (row) => {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (!user) throw new Error("Tidak terautentikasi");
            await productsService.retireProduct((row as any).product_id || row.id);
            toast.success("Aset berhasil diarsipkan/dihapus");
            refetch();
          }}
          onRowClick={(row) => {
            if (activeTab === "draft") {
              const target = row.serial_number || row.product_name || row.id;
              navigate(`/products/${encodeURIComponent(target)}`);
            } else {
              const target = row.serial_number || row.product_name || row.product_id;
              navigate(`/products/${encodeURIComponent(target)}`);
            }
          }}
          tabs={[
            {
              value: "all",
              label: "Semua",
              badge: mappedAll.length,
            },
            {
              value: "garansi",
              label: "Garansi",
              badge: mappedGaransi.length,
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
