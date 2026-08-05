import * as React from "react"

interface NavModeContextValue {
  sidebarEnabled: boolean
  sidebarMobileEnabled: boolean
  navbarEnabled: boolean
  setSidebarEnabled: (enabled: boolean) => boolean
  setSidebarMobileEnabled: (enabled: boolean) => boolean
  setNavbarEnabled: (enabled: boolean) => boolean
  topRowVisible: boolean
  toggleTopRow: () => void
}

const NavModeContext = React.createContext<NavModeContextValue>({
  sidebarEnabled: true,
  sidebarMobileEnabled: false,
  navbarEnabled: true,
  setSidebarEnabled: () => true,
  setSidebarMobileEnabled: () => true,
  setNavbarEnabled: () => true,
  topRowVisible: true,
  toggleTopRow: () => {},
})

/**
 * Purpose: provide global state for navigation options (Sidebar and Navbar).
 * Responsibilities: store sidebarEnabled, sidebarMobileEnabled, and navbarEnabled, enforce minimal 1 active rule, expose setters.
 * Usage notes: wrap AppLayout or App root — must be ancestor of SiteHeader, AppSidebar, and MobileNavbar.
 */
export function NavModeProvider({ children }: { children: React.ReactNode }) {
  // Sidebar on desktop is mandatory and always enabled
  const sidebarEnabled = true

  const [sidebarMobileEnabled, setSidebarMobileEnabledState] = React.useState<boolean>(() => {
    const saved = localStorage.getItem("sidebar-mobile-enabled")
    if (saved !== null) return saved === "true"
    return false // Default nonaktif untuk mobile
  })

  const [navbarEnabled, setNavbarEnabledState] = React.useState<boolean>(() => {
    const saved = localStorage.getItem("navbar-enabled")
    if (saved !== null) return saved === "true"
    return true
  })

  const [topRowVisible, setTopRowVisible] = React.useState(true)

  const setSidebarEnabled = React.useCallback(
    (_enabled: boolean): boolean => {
      // Sidebar desktop is mandatory
      return true
    },
    []
  )

  const setSidebarMobileEnabled = React.useCallback(
    (enabled: boolean): boolean => {
      if (!enabled && !navbarEnabled) {
        return false
      }
      setSidebarMobileEnabledState(enabled)
      localStorage.setItem("sidebar-mobile-enabled", String(enabled))
      return true
    },
    [navbarEnabled]
  )

  const setNavbarEnabled = React.useCallback(
    (enabled: boolean): boolean => {
      if (!enabled && !sidebarEnabled && !sidebarMobileEnabled) {
        // Minimal 1 option must remain enabled
        return false
      }
      setNavbarEnabledState(enabled)
      localStorage.setItem("navbar-enabled", String(enabled))
      return true
    },
    [sidebarEnabled, sidebarMobileEnabled]
  )

  const toggleTopRow = React.useCallback(() => {
    setTopRowVisible((prev) => !prev)
  }, [])

  return (
    <NavModeContext.Provider
      value={{
        sidebarEnabled,
        sidebarMobileEnabled,
        navbarEnabled,
        setSidebarEnabled,
        setSidebarMobileEnabled,
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
