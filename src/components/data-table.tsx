import * as React from "react"
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
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
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
} from "@tanstack/react-table"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  Columns3Icon,
  DownloadIcon,
  GripVerticalIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

export interface DataTableRow {
  id: UniqueIdentifier
}

export interface DataTableTab {
  value: string
  label: string
  badge?: string | number
  content?: React.ReactNode
}

export interface DataTableProps<TData extends DataTableRow> {
  addButtonLabel?: string
  columns?: ColumnDef<TData>[]
  data?: TData[]
  defaultTab?: string
  activeTab?: string
  emptyLabel?: string
  pageSizeOptions?: number[]
  tabs?: DataTableTab[]
  searchPlaceholder?: string
  csvFilename?: string
  onAddClick?: () => void
  /** Called when a data row is clicked (excluding checkboxes, drag handles, buttons, links) */
  onRowClick?: (row: TData) => void
  onTabChange?: (tab: string) => void
}

const placeholderData = [
  {
    id: "sample-row",
    title: "Sample row",
  },
]

const placeholderColumns: ColumnDef<DataTableRow>[] = [
  {
    accessorKey: "title",
    header: "Sample",
    cell: ({ row }) =>
      "title" in row.original ? String(row.original.title) : "Sample row",
  },
]

const placeholderTabs = [
  {
    value: "table",
    label: "Table",
  },
] satisfies DataTableTab[]

function DragHandle({ id }: { id: UniqueIdentifier }) {
  const { attributes, listeners } = useSortable({
    id,
  })

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
  )
}

/** Tags that should NOT trigger a row-click (they handle their own click semantics) */
const INTERACTIVE_TAGS = new Set(['INPUT', 'BUTTON', 'A', 'SELECT', 'LABEL'])
const INTERACTIVE_ROLES = new Set(['checkbox', 'menuitem', 'option', 'switch'])

function isInteractiveTarget(target: EventTarget | null): boolean {
  let el = target as HTMLElement | null
  while (el) {
    if (INTERACTIVE_TAGS.has(el.tagName)) return true
    const role = el.getAttribute('role')
    if (role && INTERACTIVE_ROLES.has(role)) return true
    if (el.dataset.dragHandle !== undefined) return true
    // Stop walking at the table row itself
    if (el.tagName === 'TR') break
    el = el.parentElement
  }
  return false
}

function DraggableRow<TData extends DataTableRow>({
  row,
  onRowClick,
}: {
  row: Row<TData>
  onRowClick?: (row: TData) => void
}) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  })

  function handleClick(e: React.MouseEvent<HTMLTableRowElement>) {
    if (isInteractiveTarget(e.target)) return
    onRowClick?.(row.original)
  }

  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className={cn(
        "relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80",
        onRowClick && "cursor-pointer",
      )}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      onClick={handleClick}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}

function createBaseColumns<TData extends DataTableRow>(): ColumnDef<TData>[] {
  return [
    {
      id: "drag",
      header: () => null,
      cell: ({ row }) => <DragHandle id={row.original.id} />,
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
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
      enableHiding: false,
    },
  ]
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
  pageSizeOptions = [10, 20, 30, 40, 50],
  tabs = placeholderTabs,
  searchPlaceholder = "Cari...",
  csvFilename = "export",
  onAddClick,
  onRowClick,
  onTabChange,
}: DataTableProps<TData>) {
  const resolvedColumns = React.useMemo<ColumnDef<TData>[]>(
    () => [
      ...createBaseColumns<TData>(),
      ...((columns ?? placeholderColumns) as ColumnDef<TData>[]),
    ],
    [columns]
  )
  const resolvedData = (initialData ?? placeholderData) as TData[]
  const resolvedDefaultTab = defaultTab ?? tabs[0]?.value ?? "table"
  const [internalActiveTab, setInternalActiveTab] = React.useState(resolvedDefaultTab)
  const currentActiveTab = controlledActiveTab ?? internalActiveTab

  const handleTabChange = React.useCallback((value: string) => {
    setInternalActiveTab(value)
    onTabChange?.(value)
  }, [onTabChange])

  const [data, setData] = React.useState(() => resolvedData)
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: pageSizeOptions[0] ?? 10,
  })
  const sortableId = React.useId()
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  )

  React.useEffect(() => {
    setData(resolvedData)
  }, [resolvedData])

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data.map(({ id }) => id),
    [data]
  )

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
    },
    getRowId: (row) => String(row.id),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      setData((currentData) => {
        const oldIndex = dataIds.indexOf(active.id)
        const newIndex = dataIds.indexOf(over.id)
        return arrayMove(currentData, oldIndex, newIndex)
      })
    }
  }

  function handleExportCsv() {
    const filteredRows = table.getFilteredRowModel().rows
    if (!filteredRows.length) return

    // Collect visible accessor columns (skip drag/select)
    const visibleCols = table
      .getAllColumns()
      .filter((col) => col.getIsVisible() && typeof col.accessorFn !== "undefined")

    const headers = visibleCols.map((col) => col.id)
    const rows = filteredRows.map((row) =>
      visibleCols.map((col) => {
        const val = row.getValue(col.id)
        const str = val === null || val === undefined ? "" : String(val)
        // Escape double quotes and wrap in quotes if needed
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"`
          : str
      })
    )

    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${csvFilename}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Tabs
      value={currentActiveTab}
      onValueChange={handleTabChange}
      className="w-full flex-col justify-start gap-6"
    >
      <div className="flex items-center justify-between px-4 lg:px-6">
        {/* Left: tabs (desktop) + view selector (mobile) */}
        <div className="flex items-center gap-3">
          <Label htmlFor="view-selector" className="sr-only">
            View
          </Label>
          <Select value={currentActiveTab} onValueChange={handleTabChange}>
            <SelectTrigger
              className="flex w-fit @4xl/main:hidden"
              size="sm"
              id="view-selector"
            >
              <SelectValue placeholder="Select a view" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {tabs.map((tab) => (
                  <SelectItem key={tab.value} value={tab.value}>
                    {tab.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <TabsList className="hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:px-1 @4xl/main:flex">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
                {tab.badge ? <Badge variant="secondary">{tab.badge}</Badge> : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Right: search + column toggle + export + add */}
        <div className="flex items-center gap-2">
          {/* Global search */}
          <div className="relative hidden sm:block">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="data-table-search"
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="h-8 w-44 pl-8 text-sm lg:w-56"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns3Icon data-icon="inline-start" />
                Columns
                <ChevronDownIcon data-icon="inline-end" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            id="data-table-export-csv"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={table.getFilteredRowModel().rows.length === 0}
            title="Ekspor CSV"
          >
            <DownloadIcon />
            <span className="hidden lg:inline">Ekspor CSV</span>
          </Button>

          <Button
            id="data-table-add"
            variant="outline"
            size="sm"
            onClick={onAddClick}
          >
            <PlusIcon />
            <span className="hidden lg:inline">{addButtonLabel}</span>
          </Button>
        </div>
      </div>
      {(() => {
        const activeTabObj = tabs.find((t) => t.value === currentActiveTab)
        if (activeTabObj?.content) {
          return (
            <TabsContent
              value={currentActiveTab}
              className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
            >
              {activeTabObj.content}
            </TabsContent>
          )
        }
        return (
          <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
            <div className="overflow-hidden rounded-lg border">
              <DndContext
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis]}
                onDragEnd={handleDragEnd}
                sensors={sensors}
                id={sortableId}
              >
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-muted">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => {
                          return (
                            <TableHead key={header.id} colSpan={header.colSpan}>
                              {header.isPlaceholder
                                ? null
                                : flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                            </TableHead>
                          )
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
                          <DraggableRow key={row.id} row={row} onRowClick={onRowClick} />
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
            <div className="flex items-center justify-between px-4">
              <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
                {table.getFilteredSelectedRowModel().rows.length} of{" "}
                {table.getFilteredRowModel().rows.length} row(s) selected.
              </div>
              <div className="flex w-full items-center gap-8 lg:w-fit">
                <div className="hidden items-center gap-2 lg:flex">
                  <Label htmlFor="rows-per-page" className="text-sm font-medium">
                    Rows per page
                  </Label>
                  <Select
                    value={`${table.getState().pagination.pageSize}`}
                    onValueChange={(value) => {
                      table.setPageSize(Number(value))
                    }}
                  >
                    <SelectTrigger size="sm" className="w-20" id="rows-per-page">
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
                <div className="flex w-fit items-center justify-center text-sm font-medium">
                  Page {table.getState().pagination.pageIndex + 1} of{" "}
                  {table.getPageCount()}
                </div>
                <div className="ml-auto flex items-center gap-2 lg:ml-0">
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
        )
      })()}
      {tabs
        .filter((tab) => tab.value !== currentActiveTab && tab.content)
        .map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="flex flex-col px-4 lg:px-6">
            {tab.content}
          </TabsContent>
        ))}
    </Tabs>
  )
}
