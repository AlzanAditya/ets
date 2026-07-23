import * as React from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type Row,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  GripVerticalIcon,
  PlusIcon,
  SearchIcon,
  MoreHorizontal,
  FilterIcon,
  XIcon,
  EyeIcon,
  CheckIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useTableDensity } from "@/contexts/table-density-context";
import { DENSITY_CONFIG } from "@/lib/table-density";

export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export interface DataTableRow {
  id: UniqueIdentifier;
}

export interface DataTableTab {
  value: string;
  label: string;
  badge?: string | number;
  content?: React.ReactNode;
}

export interface DataTableProps<TData extends DataTableRow> {
  addButtonLabel?: string;
  columns?: ColumnDef<TData>[];
  data?: TData[];
  defaultTab?: string;
  activeTab?: string;
  emptyLabel?: string;
  pageSizeOptions?: number[];
  tabs?: DataTableTab[];
  searchPlaceholder?: string;
  csvFilename?: string;
  persistenceKey?: string;
  onAddClick?: () => void;
  onRefresh?: () => void;
  /** Called when a data row is clicked (excluding checkboxes, drag handles, buttons, links) */
  onRowClick?: (row: TData) => void;
  onTabChange?: (tab: string) => void;
}

const placeholderData = [
  {
    id: "sample-row",
    title: "Sample row",
  },
];

const placeholderColumns: ColumnDef<DataTableRow>[] = [
  {
    accessorKey: "title",
    header: "Sample",
    cell: ({ row }) =>
      "title" in row.original ? String(row.original.title) : "Sample row",
  },
];

const placeholderTabs = [
  {
    value: "table",
    label: "Table",
  },
] satisfies DataTableTab[];

export function DragHandle({ id }: { id: UniqueIdentifier }) {
  const { attributes, listeners } = useSortable({
    id,
  });

  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground hover:bg-transparent"
    >
      <GripVerticalIcon className="size-3 text-muted-foreground" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  );
}

/** Tags that should NOT trigger a row-click (they handle their own click semantics) */
const INTERACTIVE_TAGS = new Set(["INPUT", "BUTTON", "A", "SELECT", "LABEL"]);
const INTERACTIVE_ROLES = new Set(["checkbox", "menuitem", "option", "switch"]);

function isInteractiveTarget(target: EventTarget | null): boolean {
  let el = target as HTMLElement | null;
  while (el) {
    if (INTERACTIVE_TAGS.has(el.tagName)) return true;
    const role = el.getAttribute("role");
    if (role && INTERACTIVE_ROLES.has(role)) return true;
    if (el.dataset.dragHandle !== undefined) return true;
    // Stop walking at the table row itself
    if (el.tagName === "TR") break;
    el = el.parentElement;
  }
  return false;
}

function DraggableRow<TData extends DataTableRow>({
  row,
  onRowClick,
}: {
  row: Row<TData>;
  onRowClick?: (row: TData) => void;
}) {
  const { density } = useTableDensity();
  const densityConfig = DENSITY_CONFIG[density];
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
    disabled: true,
  });

  const isSwipingRef = React.useRef(false);
  const touchPosRef = React.useRef({ x: 0, y: 0 });

  function handleClick(e: React.MouseEvent<HTMLTableRowElement>) {
    if (isSwipingRef.current) {
      isSwipingRef.current = false;
      return;
    }
    if (isInteractiveTarget(e.target)) return;
    onRowClick?.(row.original);
  }

  function handleTouchStart(e: React.TouchEvent<HTMLTableRowElement>) {
    isSwipingRef.current = false;
    if (e.touches[0]) {
      touchPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }

  function handleTouchMove(e: React.TouchEvent<HTMLTableRowElement>) {
    if (e.touches[0]) {
      const dx = Math.abs(e.touches[0].clientX - touchPosRef.current.x);
      const dy = Math.abs(e.touches[0].clientY - touchPosRef.current.y);
      if (dx > 6 || dy > 6) {
        isSwipingRef.current = true;
      }
    }
  }

  function handleTouchEnd() {
    setTimeout(() => {
      isSwipingRef.current = false;
    }, 150);
  }

  const isEven = row.index % 2 === 0;
  const zebraClass = isEven ? "bg-background" : "bg-muted/25 dark:bg-muted/15";

  return (
    <TableRow
      id={row.id}
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className={cn(
        "relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80 transition-colors hover:bg-muted/50",
        zebraClass,
        onRowClick && "cursor-pointer",
      )}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell
          key={cell.id}
          className={cn(
            densityConfig.cellPaddingX,
            densityConfig.cellPaddingY,
            (cell.column.id === "select" || cell.column.id === "drag") && "w-10 min-w-10 max-w-10 p-0 text-center"
          )}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}

function SortableColumnItem({
  id,
  label,
  isVisible,
  onToggle,
}: {
  id: string;
  label: string;
  isVisible: boolean;
  onToggle: (visible: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-muted/60 transition-colors select-none group cursor-pointer",
        isDragging && "opacity-60 bg-accent z-20 shadow-xs"
      )}
      onClick={() => onToggle(!isVisible)}
    >
      <div className="flex items-center gap-2 truncate min-w-0 flex-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground/50 group-hover:text-muted-foreground p-0.5 rounded touch-none hover:bg-muted shrink-0"
          title="Geser untuk mengatur urutan kolom"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVerticalIcon className="size-3.5" />
        </button>
        <span className="capitalize truncate text-foreground/90 font-medium">{label}</span>
      </div>
      {isVisible && <CheckIcon className="size-4 text-emerald-500 shrink-0 ml-2" />}
    </div>
  );
}

function createBaseColumns<TData extends DataTableRow>(): ColumnDef<TData>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: true,
    },
    {
      id: "drag",
      header: () => null,
      cell: ({ row, table }) => {
        const pageIndex = table.getState().pagination.pageIndex;
        const pageSize = table.getState().pagination.pageSize;
        return (
          <span className="flex items-center justify-center font-mono text-xs text-muted-foreground w-7 select-none">
            {pageIndex * pageSize + row.index + 1}
          </span>
        );
      },
      enableSorting: false,
      enableHiding: true,
    },
  ];
}

/**
 * Purpose: render a reusable sortable, selectable data table shell.
 * Responsibilities: manage table state, DnD rows, column visibility, tabs, and pagination.
 * Expected props: typed rows, TanStack columns, optional tabs, labels, and page size options.
 * Usage notes: generic placeholder rows and columns allow isolated development previews.
 */
export function DataTable<TData extends DataTableRow>({
  addButtonLabel = "Add Item",
  columns,
  data: initialData,
  defaultTab,
  activeTab: controlledActiveTab,
  emptyLabel = "No results.",
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  tabs = placeholderTabs,
  searchPlaceholder = "Cari...",
  csvFilename = "export",
  persistenceKey,
  onAddClick,
  onRefresh,
  onRowClick,
  onTabChange,
}: DataTableProps<TData>) {
  const { density } = useTableDensity();
  const densityConfig = DENSITY_CONFIG[density];
  const resolvedKey = persistenceKey || csvFilename || "default";
  const storageKey = `table_preferences_${resolvedKey}`;

  // Helper to load preferences
  const loadPreferences = React.useCallback(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Error loading table preferences for key:", storageKey, e);
      return {};
    }
  }, [storageKey]);

  // Helper to save preferences
  const savePreferences = React.useCallback((prefs: any) => {
    try {
      const saved = localStorage.getItem(storageKey);
      const current = saved ? JSON.parse(saved) : {};
      const updated = { ...current, ...prefs };
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.error("Error saving table preferences for key:", storageKey, e);
    }
  }, [storageKey]);

  const resolvedColumns = React.useMemo<ColumnDef<TData>[]>(
    () => [
      ...createBaseColumns<TData>(),
      ...((columns ?? placeholderColumns) as ColumnDef<TData>[]),
    ],
    [columns],
  );
  const resolvedData = (initialData ?? placeholderData) as TData[];
  const resolvedDefaultTab = defaultTab ?? tabs[0]?.value ?? "table";
  const [internalActiveTab, setInternalActiveTab] =
    React.useState(resolvedDefaultTab);
  const currentActiveTab = controlledActiveTab ?? internalActiveTab;

  const handleTabChange = React.useCallback(
    (value: string) => {
      setInternalActiveTab(value);
      onTabChange?.(value);
    },
    [onTabChange],
  );

  const [data, setData] = React.useState(() => resolvedData);
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(() => {
    const prefs = loadPreferences();
    return {
      select: false,
      ...prefs.columnVisibility,
    };
  });

  React.useEffect(() => {
    savePreferences({ columnVisibility });
  }, [columnVisibility, savePreferences]);

  React.useEffect(() => {
    setColumnVisibility((prev) => {
      const next = { ...prev };
      let updated = false;
      resolvedColumns.forEach((col) => {
        const id = col.id || (col as any).accessorKey;
        if (id && typeof id === "string") {
          if (next[id] === undefined) {
            const defaultHidden = (col.meta as any)?.defaultHidden;
            if (defaultHidden) {
              next[id] = false;
              updated = true;
            }
          }
        }
      });
      return updated ? next : prev;
    });
  }, [resolvedColumns]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState(() => {
    const prefs = loadPreferences();
    return {
      pageIndex: 0,
      pageSize: prefs.pageSize || (pageSizeOptions[0] ?? 10),
    };
  });

  const [columnOrder, setColumnOrder] = React.useState<string[]>(() => {
    return resolvedColumns.map((c) => c.id || (c as any).accessorKey || "").filter(Boolean);
  });

  React.useEffect(() => {
    const colIds = resolvedColumns.map((c) => c.id || (c as any).accessorKey || "").filter(Boolean);
    setColumnOrder((prev) => {
      if (prev.length === 0) return colIds;
      const existing = prev.filter((id) => colIds.includes(id));
      const newCols = colIds.filter((id) => !existing.includes(id));
      if (existing.includes("actions")) {
        const actionsIdx = existing.indexOf("actions");
        const beforeActions = existing.slice(0, actionsIdx);
        return [...beforeActions, ...newCols, "actions"];
      }
      return [...existing, ...newCols];
    });
  }, [resolvedColumns]);

  React.useEffect(() => {
    savePreferences({ pageSize: pagination.pageSize });
  }, [pagination.pageSize, savePreferences]);
  const sortableId = React.useId();
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {})
  );

  const columnSensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {})
  );

  React.useEffect(() => {
    setData(resolvedData);
  }, [resolvedData]);

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data.map(({ id }) => id),
    [data],
  );

  const table = useReactTable({
    data,
    columns: resolvedColumns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      globalFilter,
      pagination,
      columnOrder,
    },
    getRowId: (row) => String(row.id),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const allLeafColumns = table.getAllLeafColumns();

  const reorderableColumns = allLeafColumns.filter(
    (col) => col.getCanHide() && !["drag", "select", "actions"].includes(col.id)
  );

  const reorderableColIds = React.useMemo(
    () => reorderableColumns.map((c) => c.id),
    [reorderableColumns]
  );

  function handleColumnDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const oldIndex = reorderableColIds.indexOf(String(active.id));
      const newIndex = reorderableColIds.indexOf(String(over.id));
      if (oldIndex !== -1 && newIndex !== -1) {
        const newReorderedIds = arrayMove(reorderableColIds, oldIndex, newIndex);
        const currentOrder = table.getState().columnOrder.length > 0
          ? table.getState().columnOrder
          : allLeafColumns.map((c) => c.id);

        const frontSpecial = currentOrder.filter((id) => ["drag", "select"].includes(id));
        const endSpecial = currentOrder.filter((id) => ["actions"].includes(id));

        setColumnOrder([...frontSpecial, ...newReorderedIds, ...endSpecial]);
      }
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setData((currentData) => {
        const oldIndex = dataIds.indexOf(active.id);
        const newIndex = dataIds.indexOf(over.id);
        return arrayMove(currentData, oldIndex, newIndex);
      });
    }
  }

  function handleExportCsv() {
    const filteredRows = table.getFilteredRowModel().rows;
    if (!filteredRows.length) return;

    // Collect visible accessor columns (skip drag/select)
    const visibleCols = table
      .getAllColumns()
      .filter(
        (col) => col.getIsVisible() && typeof col.accessorFn !== "undefined",
      );

    const headers = visibleCols.map((col) => col.id);
    const rows = filteredRows.map((row) =>
      visibleCols.map((col) => {
        const val = row.getValue(col.id);
        const str = val === null || val === undefined ? "" : String(val);
        // Escape double quotes and wrap in quotes if needed
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }),
    );

    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${csvFilename}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportJson() {
    const filteredRows = table.getFilteredRowModel().rows;
    if (!filteredRows.length) return;

    const visibleCols = table
      .getAllColumns()
      .filter(
        (col) => col.getIsVisible() && typeof col.accessorFn !== "undefined"
      );

    const dataToExport = filteredRows.map((row) => {
      const obj: Record<string, any> = {};
      visibleCols.forEach((col) => {
        obj[col.id] = row.getValue(col.id);
      });
      return obj;
    });

    const json = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${csvFilename}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCopyData() {
    const filteredRows = table.getFilteredRowModel().rows;
    if (!filteredRows.length) return;

    const visibleCols = table
      .getAllColumns()
      .filter(
        (col) => col.getIsVisible() && typeof col.accessorFn !== "undefined"
      );

    const headers = visibleCols.map((col) => col.id);
    const rows = filteredRows.map((row) =>
      visibleCols.map((col) => {
        const val = row.getValue(col.id);
        return val === null || val === undefined ? "" : String(val);
      })
    );

    const text = [headers.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n");
    navigator.clipboard.writeText(text)
      .then(() => {
        toast.success("Data copied to clipboard");
      })
      .catch((err) => {
        console.error("Failed to copy data:", err);
        toast.error("Failed to copy data");
      });
  }

  function handlePrintTable() {
    window.print();
  }

  function handleRefreshData() {
    if (onRefresh) {
      onRefresh();
    }
  }

  return (
    <Tabs
      value={currentActiveTab}
      onValueChange={handleTabChange}
      className="w-full flex-col justify-start gap-4"
    >
      <div className="flex items-center justify-between px-4 lg:px-6">
        {/* Left: View selector & Filter Dropdown (top-left button) */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium border-border/80 px-2.5">
                <FilterIcon className="size-3.5 text-emerald-500" />
                <span>
                  {tabs.find((t) => t.value === currentActiveTab)?.label || "Tampilan & Filter"}
                </span>
                <ChevronDownIcon className="size-3 text-muted-foreground opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52 rounded-xl">
              {/* Views section */}
              <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Tampilan / Tab
              </DropdownMenuLabel>
              {tabs.map((tab) => (
                <DropdownMenuCheckboxItem
                  key={tab.value}
                  checked={currentActiveTab === tab.value}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={() => handleTabChange(tab.value)}
                  className="text-xs cursor-pointer"
                >
                  {tab.label}
                  {tab.badge ? (
                    <span className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded-full font-semibold">
                      {tab.badge}
                    </span>
                  ) : null}
                </DropdownMenuCheckboxItem>
              ))}

              <DropdownMenuSeparator />

              {/* Column Filters Section */}
              <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Filter Kolom
              </DropdownMenuLabel>
              {table
                .getAllColumns()
                .filter(
                  (col) =>
                    !["select", "drag", "actions"].includes(col.id) &&
                    col.getCanFilter()
                )
                .map((col) => {
                  const uniqueValuesMap = col.getFacetedUniqueValues();
                  const uniqueValues = Array.from(uniqueValuesMap.keys()).filter(
                    (v) => v !== null && v !== undefined && String(v).trim() !== ""
                  );

                  // Label formatting for columns
                  let colLabel = col.id.replace(/_/g, " ");
                  if (col.id === "current_client_name" || col.id === "klien_pemegang" || col.id === "pemegang") {
                    colLabel = "pemegang";
                  } else if (col.id === "cabang" || col.id === "branch_name") {
                    colLabel = "cabang";
                  } else if (col.id === "status") {
                    colLabel = "status";
                  } else if (col.id === "kategori" || col.id === "category_name") {
                    colLabel = "kategori";
                  }

                  if (uniqueValues.length === 0) return null;

                  const currentFilterVal = col.getFilterValue();

                  return (
                    <DropdownMenuSub key={col.id}>
                      <DropdownMenuSubTrigger className="capitalize text-xs cursor-pointer">
                        <span>{colLabel}</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-52 max-h-60 overflow-y-auto rounded-xl">
                        <DropdownMenuItem
                          onSelect={(e) => e.preventDefault()}
                          onClick={() => col.setFilterValue(undefined)}
                          className="text-xs text-muted-foreground italic cursor-pointer"
                        >
                          Semua {colLabel}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {uniqueValues.map((rawVal) => {
                          const valStr = String(rawVal);
                          const isChecked = currentFilterVal === rawVal || currentFilterVal === valStr;
                          return (
                            <DropdownMenuCheckboxItem
                              key={valStr}
                              checked={isChecked}
                              onSelect={(e) => e.preventDefault()}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  col.setFilterValue(rawVal);
                                } else {
                                  col.setFilterValue(undefined);
                                }
                              }}
                              className="text-xs capitalize cursor-pointer"
                            >
                              {valStr}
                            </DropdownMenuCheckboxItem>
                          );
                        })}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right: search + column toggle + export + add */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* Global search */}
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="data-table-search"
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="h-7 w-20 pl-8 text-xs transition-all focus:w-36 sm:w-44 sm:focus:w-44 lg:w-56"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="size-8 border-border/80 shrink-0"
                title="Visibilitas & Urutan Kolom"
                aria-label="Visibilitas & Urutan Kolom"
              >
                <EyeIcon className="size-4 text-white" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-60 max-h-[380px] overflow-y-auto p-2 rounded-xl"
            >
              <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                Atur Urutan & Visibilitas
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1" />

              <DndContext
                sensors={columnSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleColumnDragEnd}
              >
                <SortableContext
                  items={reorderableColIds}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col gap-0.5">
                    {reorderableColumns.map((column) => (
                      <SortableColumnItem
                        key={column.id}
                        id={column.id}
                        label={column.id.replace(/_/g, " ")}
                        isVisible={column.getIsVisible()}
                        onToggle={(value) => column.toggleVisibility(value)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {(() => {
                const specialCols = allLeafColumns.filter((column) =>
                  ["drag", "select", "actions"].includes(column.id)
                );

                if (specialCols.length === 0) return null;

                const specialLabels: Record<string, string> = {
                  drag: "Nomor Urut",
                  select: "Checklistbox",
                  actions: "Action",
                };

                return (
                  <>
                    <DropdownMenuSeparator className="my-1.5" />
                    <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-0.5">
                      Kolom Khusus
                    </DropdownMenuLabel>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      {specialCols.map((column) => (
                        <div
                          key={column.id}
                          className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-muted/60 transition-colors select-none cursor-pointer"
                          onClick={() => column.toggleVisibility(!column.getIsVisible())}
                        >
                          <span className="capitalize font-medium text-foreground/90 pl-6">
                            {specialLabels[column.id] ?? column.id}
                          </span>
                          {column.getIsVisible() && (
                            <CheckIcon className="size-4 text-emerald-500 shrink-0 ml-2" />
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                id="data-table-actions-dropdown"
                variant="outline"
                size="sm"
                title="Aksi & Ekspor"
                className="h-7 px-2 flex items-center gap-1"
              >
                <MoreHorizontal className="size-4" />
                <span className="hidden text-xs sm:inline">Aksi</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={handleExportCsv}
                disabled={table.getFilteredRowModel().rows.length === 0}
              >
                Ekspor CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportJson}
                disabled={table.getFilteredRowModel().rows.length === 0}
              >
                Ekspor JSON
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled
              >
                Ekspor Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleCopyData}
                disabled={table.getFilteredRowModel().rows.length === 0}
              >
                Salin Data
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handlePrintTable}
                disabled={table.getFilteredRowModel().rows.length === 0}
              >
                Cetak Tabel
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleRefreshData}
                disabled={!onRefresh}
              >
                Muat Ulang Data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            id="data-table-add"
            variant="default"
            size="sm"
            onClick={onAddClick}
            className="bg-primary text-background hover:bg-primary/90"
          >
            <PlusIcon />
            <span className="hidden lg:inline">{addButtonLabel}</span>
          </Button>
        </div>
      </div>
      {(() => {
        const activeTabObj = tabs.find((t) => t.value === currentActiveTab);
        if (activeTabObj?.content) {
          return (
            <TabsContent
              value={currentActiveTab}
              className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
            >
              {activeTabObj.content}
            </TabsContent>
          );
        }
        return (
          <div className="relative flex flex-col gap-3 overflow-auto px-4 lg:px-6">
            {columnFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1 mr-1">
                  <FilterIcon className="size-3 text-emerald-500" />
                  Filter Aktif:
                </span>
                {columnFilters.map((filter) => {
                  const col = table.getColumn(filter.id);
                  let label = filter.id.replace(/_/g, " ");
                  if (filter.id === "current_client_name" || filter.id === "klien_pemegang" || filter.id === "pemegang") {
                    label = "pemegang";
                  }
                  return (
                    <Badge
                      key={filter.id}
                      variant="secondary"
                      className="text-xs flex items-center gap-1.5 py-0.5 px-2.5 bg-background text-foreground border border-emerald-500/30 rounded-md shadow-2xs"
                    >
                      <span className="capitalize text-muted-foreground">{label}:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{String(filter.value)}</span>
                      <button
                        onClick={() => col?.setFilterValue(undefined)}
                        className="ml-1 text-muted-foreground hover:text-destructive transition-colors rounded-full"
                        title="Hapus filter"
                      >
                        <XIcon className="size-3" />
                      </button>
                    </Badge>
                  );
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setColumnFilters([])}
                  className="h-6 text-xs px-2 text-muted-foreground hover:text-destructive"
                >
                  Hapus Semua
                </Button>
              </div>
            )}
            <div className="-mx-4 overflow-hidden rounded-none border-y md:mx-0 md:rounded-lg md:border">
              <DndContext
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis]}
                onDragEnd={handleDragEnd}
                sensors={sensors}
                id={sortableId}
              >
                <Table style={{ zoom: densityConfig.scale }}>
                  <TableHeader className="sticky top-0 z-10 bg-muted">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => {
                          return (
                            <TableHead
                              key={header.id}
                              colSpan={header.colSpan}
                              className={cn(
                                "border-r last:border-r-0 h-auto",
                                densityConfig.cellPaddingX,
                                densityConfig.cellPaddingY,
                                (header.column.id === "select" || header.column.id === "drag") && "w-10 min-w-10 max-w-10 p-0 text-center"
                              )}
                            >
                              {header.isPlaceholder
                                ? null
                                : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                            </TableHead>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody className="**:data-[slot=table-cell]:first:w-8">
                    {table.getRowModel().rows?.length ? (
                      <SortableContext
                        items={dataIds}
                        strategy={verticalListSortingStrategy}
                      >
                        {table.getRowModel().rows.map((row) => (
                          <DraggableRow
                            key={row.id}
                            row={row}
                            onRowClick={onRowClick}
                          />
                        ))}
                      </SortableContext>
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={resolvedColumns.length}
                          className="h-24 text-center"
                        >
                          {emptyLabel}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </DndContext>
            </div>
            <div className="flex items-center justify-between">
              <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
                {table.getFilteredSelectedRowModel().rows.length} of{" "}
                {table.getFilteredRowModel().rows.length} row(s) selected.
              </div>
              <div className="flex w-full items-center justify-between gap-3 sm:gap-8 lg:w-fit">
                <div className="flex items-center gap-1.5">
                  <Label
                    htmlFor="rows-per-page"
                    className="hidden text-xs text-muted-foreground sm:inline sm:text-sm sm:font-medium"
                  >
                    Rows per page
                  </Label>
                  <Select
                    value={`${table.getState().pagination.pageSize}`}
                    onValueChange={(value) => {
                      table.setPageSize(Number(value));
                    }}
                  >
                    <SelectTrigger
                      size="sm"
                      className="w-16 sm:w-20 h-8 text-xs sm:text-sm"
                      id="rows-per-page"
                    >
                      <SelectValue
                        placeholder={table.getState().pagination.pageSize}
                      />
                    </SelectTrigger>
                    <SelectContent side="top">
                      <SelectGroup>
                        {pageSizeOptions.map((pageSize) => (
                          <SelectItem key={pageSize} value={`${pageSize}`}>
                            {pageSize}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex w-fit items-center justify-center text-xs sm:text-sm font-medium text-muted-foreground">
                  Page {table.getState().pagination.pageIndex + 1} of{" "}
                  {table.getPageCount()}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="hidden h-8 w-8 p-0 lg:flex"
                    onClick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <span className="sr-only">Go to first page</span>
                    <ChevronsLeftIcon />
                  </Button>
                  <Button
                    variant="outline"
                    className="size-8"
                    size="icon"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <span className="sr-only">Go to previous page</span>
                    <ChevronLeftIcon />
                  </Button>
                  <Button
                    variant="outline"
                    className="size-8"
                    size="icon"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    <span className="sr-only">Go to next page</span>
                    <ChevronRightIcon />
                  </Button>
                  <Button
                    variant="outline"
                    className="hidden size-8 lg:flex"
                    size="icon"
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={!table.getCanNextPage()}
                  >
                    <span className="sr-only">Go to last page</span>
                    <ChevronsRightIcon />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {tabs
        .filter((tab) => tab.value !== currentActiveTab && tab.content)
        .map((tab) => (
          <TabsContent
            key={tab.value}
            value={tab.value}
            className="flex flex-col px-4 lg:px-6"
          >
            {tab.content}
          </TabsContent>
        ))}
    </Tabs>
  );
}
