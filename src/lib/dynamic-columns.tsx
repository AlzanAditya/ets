/**
 * dynamic-columns.tsx
 *
 * Utility that generates TanStack Table `ColumnDef[]` from a raw database
 * `ColumnSchema[]` (fetched at runtime from information_schema).
 *
 * Strategy
 * ─────────
 * • "Pinned" columns defined per-table in the page file take priority and are
 *   rendered with rich, custom cells.
 * • Columns present in the schema but NOT pinned get auto-generated column
 *   defs with safe, type-aware fallback renderers.
 * • UUID foreign-key columns are shown truncated and hidden by default.
 * • Timestamp / date columns are formatted with toLocaleDateString.
 * • JSON / array / complex columns show a "[object]" badge instead of crashing.
 */

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { DataTableRow } from "@/components/data-table";
import type { ColumnSchema } from "@/hooks/use-table-schema";
import { isComplexType, isDateColumn, isUuidColumn } from "@/hooks/use-table-schema";

// ─── Safe Cell Renderer ───────────────────────────────────────────────────────

/**
 * Renders any cell value safely. Handles null, undefined, objects, arrays.
 */
function SafeCellValue({ value }: { value: unknown }): React.ReactElement {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground/50">—</span>;
  }

  if (typeof value === "boolean") {
    return (
      <span
        className={
          value
            ? "text-emerald-500 font-medium"
            : "text-muted-foreground font-medium"
        }
      >
        {value ? "Ya" : "Tidak"}
      </span>
    );
  }

  if (typeof value === "object") {
    // Arrays or objects — don't crash, show a safe badge
    const preview = Array.isArray(value)
      ? `[${(value as unknown[]).length} item${(value as unknown[]).length !== 1 ? "s" : ""}]`
      : "[object]";
    return (
      <span className="font-mono text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
        {preview}
      </span>
    );
  }

  return <span>{String(value)}</span>;
}

/**
 * Renders a UUID value. Shows first 8 chars with ellipsis, full value on title.
 */
function UuidCellValue({ value }: { value: unknown }): React.ReactElement {
  if (!value || typeof value !== "string") {
    return <span className="text-muted-foreground/50">—</span>;
  }
  return (
    <span
      title={value}
      className="font-mono text-xs text-muted-foreground cursor-default"
    >
      {value.substring(0, 8)}…
    </span>
  );
}

/**
 * Renders a date/timestamp value in Indonesian locale.
 */
function DateCellValue({ value }: { value: unknown }): React.ReactElement {
  if (!value || typeof value !== "string") {
    return <span className="text-muted-foreground/50">—</span>;
  }
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return <span className="text-muted-foreground">{value}</span>;
    return (
      <span className="text-muted-foreground text-sm">
        {d.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </span>
    );
  } catch {
    return <span className="text-muted-foreground">{String(value)}</span>;
  }
}

// ─── Column Builder ───────────────────────────────────────────────────────────

/**
 * Given a ColumnSchema, generates a TanStack Table `ColumnDef` with a safe,
 * type-aware cell renderer. UUID columns are hidden by default.
 */
export function buildColumnDefFromSchema<TData extends DataTableRow>(
  schema: ColumnSchema,
): ColumnDef<TData> {
  const key = schema.column_name;
  const label = key.replace(/_/g, " ");

  const isUuid = isUuidColumn(schema.data_type);
  const isDate = isDateColumn(schema.data_type);
  const isComplex = isComplexType(schema.data_type);

  return {
    accessorKey: key,
    id: key,
    header: label.charAt(0).toUpperCase() + label.slice(1),
    // UUID FK columns and timestamps start hidden — users can toggle them via
    // the Columns dropdown without cluttering the default view.
    ...(isUuid ? { meta: { defaultHidden: true } } : {}),
    cell: ({ row }) => {
      const value = (row.original as Record<string, unknown>)[key];

      if (isComplex) {
        return <SafeCellValue value={value} />;
      }
      if (isUuid) {
        return <UuidCellValue value={value} />;
      }
      if (isDate) {
        return <DateCellValue value={value} />;
      }

      return <SafeCellValue value={value} />;
    },
  };
}

/**
 * Merges "pinned" (manually defined) columns with auto-generated dynamic columns
 * derived from the database schema.
 *
 * @param pinnedColumns - Manually defined columns with custom cell renderers.
 *   These always come first and their column IDs take precedence.
 * @param schema - Full list of columns fetched from information_schema.
 * @param exclude - Column names to always skip (e.g. primary key UUIDs that
 *   would be confusing or redundant).
 */
export function mergeDynamicColumns<TData extends DataTableRow>(
  pinnedColumns: ColumnDef<TData>[],
  schema: ColumnSchema[],
  exclude: string[] = [],
): ColumnDef<TData>[] {
  // Build a set of column IDs that are already handled by pinned columns.
  const pinnedIds = new Set<string>(
    pinnedColumns.map((c) => (c as { id?: string; accessorKey?: string }).id ?? (c as { accessorKey?: string }).accessorKey ?? ""),
  );

  const excludeSet = new Set(exclude);

  // Generate dynamic columns for any schema column not already pinned or excluded.
  const dynamicCols: ColumnDef<TData>[] = schema
    .filter(
      (s) =>
        !pinnedIds.has(s.column_name) &&
        !excludeSet.has(s.column_name),
    )
    .map((s) => buildColumnDefFromSchema<TData>(s));

  return [...pinnedColumns, ...dynamicCols];
}
