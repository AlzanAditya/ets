import * as React from "react"

type NavMode = "navbar" | "sidebar"

interface NavModeContextValue {
  navMode: NavMode
  setNavMode: (mode: NavMode) => void
  topRowVisible: boolean
  toggleTopRow: () => void
}

const NavModeContext = React.createContext<NavModeContextValue>({
  navMode: "sidebar",
  setNavMode: () => {},
  topRowVisible: true,
  toggleTopRow: () => {},
})

/**
 * Purpose: provide global state for mobile nav mode (navbar vs sidebar) and top-row visibility.
 * Responsibilities: store navMode, topRowVisible; expose setters.
 * Usage notes: wrap AppLayout or App root — must be ancestor of SiteHeader and MobileNavbar.
 */
export function NavModeProvider({ children }: { children: React.ReactNode }) {
  const [navMode, setNavMode] = React.useState<NavMode>("sidebar")
  const [topRowVisible, setTopRowVisible] = React.useState(true)

  const toggleTopRow = React.useCallback(() => {
    setTopRowVisible((prev) => !prev)
  }, [])

  return (
    <NavModeContext.Provider value={{ navMode, setNavMode, topRowVisible, toggleTopRow }}>
      {children}
    </NavModeContext.Provider>
  )
}

export function useNavMode() {
  return React.useContext(NavModeContext)
}
