import * as React from "react"

export interface BreadcrumbContextType {
  subLabel: string | null
  subValue: string | null
  setBreadcrumb: (label: string | null, value?: string | null) => void
}

const BreadcrumbContext = React.createContext<BreadcrumbContextType | undefined>(undefined)

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [subLabel, setSubLabel] = React.useState<string | null>(null)
  const [subValue, setSubValue] = React.useState<string | null>(null)

  const setBreadcrumb = React.useCallback((label: string | null, value?: string | null) => {
    setSubLabel(label)
    setSubValue(value ?? null)
  }, [])

  return (
    <BreadcrumbContext.Provider value={{ subLabel, subValue, setBreadcrumb }}>
      {children}
    </BreadcrumbContext.Provider>
  )
}

export function useBreadcrumb() {
  const context = React.useContext(BreadcrumbContext)
  if (context === undefined) {
    throw new Error("useBreadcrumb must be used within a BreadcrumbProvider")
  }
  return context
}
