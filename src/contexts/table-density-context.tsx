import * as React from "react"
import { TableDensity, DEFAULT_DENSITY, DENSITY_STORAGE_KEY } from "../lib/table-density"

interface TableDensityContextValue {
  density: TableDensity
  setDensity: (density: TableDensity) => void
}

const TableDensityContext = React.createContext<TableDensityContextValue | null>(null)

/**
 * Provider to manage and persist the selected table density across the app.
 * Stores preferences in localStorage and applies a data attribute to the <html> tag.
 */
export function TableDensityProvider({ children }: { children: React.ReactNode }) {
  const [density, setDensityState] = React.useState<TableDensity>(() => {
    try {
      const stored = localStorage.getItem(DENSITY_STORAGE_KEY)
      if (stored === "spacious" || stored === "normal" || stored === "compact") {
        return stored as TableDensity
      }
      return DEFAULT_DENSITY
    } catch {
      return DEFAULT_DENSITY
    }
  })

  React.useEffect(() => {
    try {
      document.documentElement.setAttribute("data-table-density", density)
    } catch { /* ignore */ }
  }, [density])

  const setDensity = React.useCallback((next: TableDensity) => {
    setDensityState(next)
    try {
      localStorage.setItem(DENSITY_STORAGE_KEY, next)
    } catch { /* ignore */ }
  }, [])

  const value = React.useMemo(() => ({ density, setDensity }), [density, setDensity])

  return (
    <TableDensityContext.Provider value={value}>
      {children}
    </TableDensityContext.Provider>
  )
}

export function useTableDensity() {
  const context = React.useContext(TableDensityContext)
  if (!context) {
    throw new Error("useTableDensity must be used within TableDensityProvider")
  }
  return context
}
