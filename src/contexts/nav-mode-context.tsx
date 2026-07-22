import * as React from "react"

interface NavModeContextValue {
  sidebarEnabled: boolean
  navbarEnabled: boolean
  setSidebarEnabled: (enabled: boolean) => boolean
  setNavbarEnabled: (enabled: boolean) => boolean
  topRowVisible: boolean
  toggleTopRow: () => void
}

const NavModeContext = React.createContext<NavModeContextValue>({
  sidebarEnabled: true,
  navbarEnabled: true,
  setSidebarEnabled: () => true,
  setNavbarEnabled: () => true,
  topRowVisible: true,
  toggleTopRow: () => {},
})

/**
 * Purpose: provide global state for navigation options (Sidebar and Navbar).
 * Responsibilities: store sidebarEnabled and navbarEnabled, enforce minimal 1 active rule, expose setters.
 * Usage notes: wrap AppLayout or App root — must be ancestor of SiteHeader, AppSidebar, and MobileNavbar.
 */
export function NavModeProvider({ children }: { children: React.ReactNode }) {
  const [sidebarEnabled, setSidebarEnabledState] = React.useState<boolean>(() => {
    const saved = localStorage.getItem("sidebar-enabled")
    if (saved !== null) return saved === "true"
    return true
  })

  const [navbarEnabled, setNavbarEnabledState] = React.useState<boolean>(() => {
    const saved = localStorage.getItem("navbar-enabled")
    if (saved !== null) return saved === "true"
    return true
  })

  const [topRowVisible, setTopRowVisible] = React.useState(true)

  const setSidebarEnabled = React.useCallback(
    (enabled: boolean): boolean => {
      if (!enabled && !navbarEnabled) {
        // Minimal 1 option must remain enabled
        return false
      }
      setSidebarEnabledState(enabled)
      localStorage.setItem("sidebar-enabled", String(enabled))
      return true
    },
    [navbarEnabled]
  )

  const setNavbarEnabled = React.useCallback(
    (enabled: boolean): boolean => {
      if (!enabled && !sidebarEnabled) {
        // Minimal 1 option must remain enabled
        return false
      }
      setNavbarEnabledState(enabled)
      localStorage.setItem("navbar-enabled", String(enabled))
      return true
    },
    [sidebarEnabled]
  )

  const toggleTopRow = React.useCallback(() => {
    setTopRowVisible((prev) => !prev)
  }, [])

  return (
    <NavModeContext.Provider
      value={{
        sidebarEnabled,
        navbarEnabled,
        setSidebarEnabled,
        setNavbarEnabled,
        topRowVisible,
        toggleTopRow,
      }}
    >
      {children}
    </NavModeContext.Provider>
  )
}

export function useNavMode() {
  return React.useContext(NavModeContext)
}
