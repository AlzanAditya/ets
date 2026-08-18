import * as React from "react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"

import { AppSidebar } from "@/components/app-sidebar"
import { MobileNavbar } from "@/components/mobile-navbar"
import { SiteHeader } from "@/components/site-header"
import { NotificationBell } from "@/components/notification-bell"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { appNavigation } from "@/config/navigation"
import { NavModeProvider, useNavMode } from "@/contexts/nav-mode-context"
import { useAuth } from "@/contexts/auth-context"
import { useIsMobile } from "@/hooks/use-mobile"
import { useTransactionStats } from "@/hooks/use-transactions"
import { useRealtimeSync } from "@/hooks/use-realtime-sync"
import { cn } from "@/lib/utils"
import { PageContentSkeleton } from "./PageContentSkeleton"

function AppLayoutContent({
  activeUrl,
  mainItems,
  secondaryItems,
  userNav,
  handleNavigate,
}: {
  activeUrl: string
  mainItems: typeof appNavigation.mainItems
  secondaryItems: typeof appNavigation.secondaryItems
  userNav: { name: string; email: string; fallback: string }
  handleNavigate: (url: string) => void
}) {
  const { sidebarEnabled, sidebarMobileEnabled, navbarEnabled } = useNavMode()
  const isMobile = useIsMobile()
  const isSidebarVisible = isMobile ? sidebarMobileEnabled : sidebarEnabled

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      {isSidebarVisible && (
        <AppSidebar
          activeUrl={activeUrl}
          brand={appNavigation.brand}
          mainItems={mainItems}
          onNavigate={handleNavigate}
          planSections={appNavigation.planSections}
          quickActions={appNavigation.quickActions}
          secondaryItems={secondaryItems}
          user={userNav}
          variant="inset"
        />
      )}
      <SidebarInset>
        <SiteHeader
          activeUrl={activeUrl}
          breadcrumbLabels={appNavigation.breadcrumbLabels}
          onNavigate={handleNavigate}
          actions={<NotificationBell onNavigate={handleNavigate} />}
        />
        <div className={cn("flex min-w-0 flex-1 flex-col", navbarEnabled && "max-md:pb-24")}>
          <React.Suspense fallback={<PageContentSkeleton />}>
            <Outlet />
          </React.Suspense>
        </div>
        <MobileNavbar />
      </SidebarInset>
    </SidebarProvider>
  )
}

export function AppLayout() {
  useRealtimeSync()

  React.useEffect(() => {
    // Dynamic import to break circular dependency with lazy-routes chunk
    import("@/lib/lazy-routes")
      .then((mod) => {
        if (typeof mod.preloadAllAdminRoutes === "function") {
          mod.preloadAllAdminRoutes()
        }
      })
      .catch(() => {})
  }, [])

  const location = useLocation()
  const navigate = useNavigate()
  const activeUrl = location.pathname === "/" ? "/dashboard" : location.pathname
  const { role, profile, user } = useAuth()

  const handleNavigate = React.useCallback(
    (url: string) => {
      navigate(url)
    },
    [navigate]
  )

  const { stats } = useTransactionStats()
  const pendingCount = stats?.pending_count ?? 0

  const filteredMainItems = React.useMemo(() => {
    let items = appNavigation.mainItems
    if (role === "worker") {
      items = items.filter(
        (item) =>
          item.title !== "Workers" &&
          item.url !== "/workers" &&
          item.title !== "Settings" &&
          item.url !== "/settings" &&
          item.title !== "User Management" &&
          item.url !== "/users"
      )
    }
    return items.map((item) => {
      if (item.title === "Transaction" && pendingCount > 0) {
        return {
          ...item,
          badge: pendingCount,
          badgeVariant: "amber" as const,
        }
      }
      return item
    })
  }, [pendingCount, role])

  const filteredSecondaryItems = React.useMemo(() => {
    let items = appNavigation.secondaryItems
    if (role === "worker") {
      items = items.filter(
        (item) =>
          item.title !== "Settings" &&
          item.url !== "/settings" &&
          item.title !== "Workers" &&
          item.url !== "/workers" &&
          item.title !== "User Management" &&
          item.url !== "/users"
      )
    }
    return items
  }, [role])

  const userNav = React.useMemo(() => {
    const name =
      profile?.full_name ||
      profile?.name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      (user?.email ? user.email.split("@")[0] : null) ||
      "User"
    const email = profile?.email || user?.email || ""
    const fallback = name ? name.slice(0, 2).toUpperCase() : "US"
    return { name, email, fallback }
  }, [profile, user])

  return (
    <NavModeProvider>
      <AppLayoutContent
        activeUrl={activeUrl}
        mainItems={filteredMainItems}
        secondaryItems={filteredSecondaryItems}
        userNav={userNav}
        handleNavigate={handleNavigate}
      />
    </NavModeProvider>
  )
}

export default AppLayout

