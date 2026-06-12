// ─── Table Density Config ──────────────────────────────────────────────────────
//
// Single source of truth for all density levels.
// Used by: TableDensityContext, data-table.tsx, Settings UI.
// ──────────────────────────────────────────────────────────────────────────────

export type TableDensity = "spacious" | "normal" | "compact"

export interface DensityConfig {
  /** Human-readable label shown in Settings UI */
  label: string
  /** Short description shown below the label in Settings UI */
  description: string
  /** Tailwind horizontal padding class applied to each table cell / header */
  cellPaddingX: string
  /** Tailwind vertical padding class applied to each table cell / header */
  cellPaddingY: string
  /**
   * Font-size percentage applied to the table content wrapper (secondary scale).
   * Controls text + icon sizes proportionally without layout compensation hacks.
   * 1.0 = no change, 0.85 = 85%, 0.70 = 70%.
   */
  scale: number
}

export const DENSITY_CONFIG: Record<TableDensity, DensityConfig> = {
  spacious: {
    label: "Spacious",
    description: "Keterbacaan maksimal, baris lebih tinggi",
    cellPaddingX: "px-4",
    cellPaddingY: "py-3",
    scale: 1.0,
  },
  normal: {
    label: "Normal",
    description: "Seimbang antara kepadatan dan keterbacaan",
    cellPaddingX: "px-3.5",
    cellPaddingY: "py-2",
    scale: 0.85,
  },
  compact: {
    label: "Compact",
    description: "Data maksimal di layar, ideal untuk mobile",
    cellPaddingX: "px-3",
    cellPaddingY: "py-1.5",
    scale: 0.70,
  },
} as const

export const ALL_DENSITIES: TableDensity[] = ["spacious", "normal", "compact"]
export const DEFAULT_DENSITY: TableDensity = "normal"
export const DENSITY_STORAGE_KEY = "ets:table-density"
