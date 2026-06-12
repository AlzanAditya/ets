import * as React from "react"

type NavMode = "navbar" | "sidebar"

interface NavModeContextValue {
  navMode: NavMode
  setNavMode: (mode: NavMode) => void
  topRowVisible: boolean
  toggleTopRow: () => void
}

const NavModeContext = React.createContext<NavModeContextValue>({
  navMode: "navbar",
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
  const [navMode, setNavModeState] = React.useState<NavMode>(() => {
    const saved = localStorage.getItem("mobile-nav-mode")
    return (saved === "navbar" || saved === "sidebar") ? saved : "navbar"
  })
  const [topRowVisible, setTopRowVisible] = React.useState(true)

  const setNavMode = React.useCallback((mode: NavMode) => {
    setNavModeState(mode)
    localStorage.setItem("mobile-nav-mode", mode)
  }, [])

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
