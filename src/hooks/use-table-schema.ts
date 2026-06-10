import * as React from "react";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ColumnSchema {
  column_name: string;
  data_type: string;
  is_nullable: "YES" | "NO";
  column_default: string | null;
}

export type TableName =
  | "products"
  | "transactions"
  | "clients"
  | "branches"
  | "scan_logs"
  | "transaction_items"
  | "inventory_movements";

interface UseTableSchemaResult {
  columns: ColumnSchema[];
  loading: boolean;
  error: string | null;
}

// ─── Cache ────────────────────────────────────────────────────────────────────
// Module-level cache so we don't re-fetch on every mount.
const schemaCache = new Map<string, ColumnSchema[]>();

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fetches the column schema for a given Supabase public table from
 * `information_schema.columns`. Results are cached per table name for the
 * lifetime of the browser session (no re-fetch needed unless the page reloads).
 *
 * @param tableName - One of the public table names in the Supabase project.
 */
export function useTableSchema(tableName: TableName): UseTableSchemaResult {
  const [columns, setColumns] = React.useState<ColumnSchema[]>(
    () => schemaCache.get(tableName) ?? [],
  );
  const [loading, setLoading] = React.useState<boolean>(
    () => !schemaCache.has(tableName),
  );
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Already cached — nothing to do.
    if (schemaCache.has(tableName)) {
      setColumns(schemaCache.get(tableName)!);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function fetchSchema() {
      try {
        // We use a raw RPC query via execute_sql equivalent through the REST API.
        // Supabase exposes information_schema through PostgREST when RLS is off on it,
        // but the safest cross-project approach is a custom RPC or .rpc().
        // Since we don't have a custom RPC, we query via a select on information_schema
        // using the supabase client's .from() with a schema override trick —
        // but that requires extra config. Instead we use a .rpc() call if available,
        // or fall back to a known-safe approach using the Supabase REST API directly.
        //
        // APPROACH: use supabase.rpc() to call a simple pg function that queries
        // information_schema. If the function doesn't exist, we fall back to the
        // TypeScript-side static column list derived from the Database type.
        //
        // However, the cleanest zero-migration approach for this project is to
        // use the supabase client to query the `information_schema.columns` view
        // via the `pg_catalog` schema route, which is accessible in Supabase
        // through the REST API by specifying the `information_schema` schema.
        //
        // Supabase JS v2 supports schema selection via:
        //   supabase.schema('information_schema').from('columns').select(...)
        //
        const { data, error: sbError } = await (supabase as any)
          .schema("information_schema")
          .from("columns")
          .select("column_name, data_type, is_nullable, column_default")
          .eq("table_schema", "public")
          .eq("table_name", tableName)
          .order("ordinal_position", { ascending: true });

        if (cancelled) return;

        if (sbError) {
          // Fallback: schema endpoint may not be exposed. Silently degrade.
          console.warn(
            `[useTableSchema] Could not fetch schema for "${tableName}":`,
            sbError.message,
          );
          setError(null); // Non-fatal — table works with pre-defined columns
          setColumns([]);
          setLoading(false);
          return;
        }

        const cols: ColumnSchema[] = (data ?? []) as ColumnSchema[];
        schemaCache.set(tableName, cols);
        setColumns(cols);
      } catch (err: any) {
        if (cancelled) return;
        console.warn(
          `[useTableSchema] Unexpected error fetching schema:`,
          err?.message,
        );
        setError(null); // Non-fatal
        setColumns([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSchema();
    return () => {
      cancelled = true;
    };
  }, [tableName]);

  return { columns, loading, error };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true for data types that are "complex" and shouldn't be rendered
 * directly as a plain string in a table cell.
 */
export function isComplexType(dataType: string): boolean {
  const complex = ["json", "jsonb", "ARRAY", "array", "USER-DEFINED"];
  return complex.some((c) => dataType.toLowerCase().includes(c.toLowerCase()));
}

/**
 * Returns true for UUID columns — they are usually FK references and
 * are better shown as truncated or hidden by default.
 */
export function isUuidColumn(dataType: string): boolean {
  return dataType === "uuid";
}

/**
 * Returns true for timestamp / date columns.
 */
export function isDateColumn(dataType: string): boolean {
  return (
    dataType.includes("timestamp") ||
    dataType === "date" ||
    dataType === "time"
  );
}
