import * as React from "react"
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom"

import { AppSidebar } from "@/components/app-sidebar"
import { MobileNavbar } from "@/components/mobile-navbar"
import { SiteHeader } from "@/components/site-header"
import { NotificationBell } from "@/components/notification-bell"
import { ProtectedRoute } from "@/components/protected-route"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { appNavigation } from "@/config/navigation"
import { AuthProvider } from "@/contexts/auth-context"
import { AnimationProvider } from "@/contexts/animation-context"
import { NavModeProvider, useNavMode } from "@/contexts/nav-mode-context"
import { useTransactionStats } from "@/hooks/use-transactions"
import LoginPage from "@/pages/auth/login"
import ClientPage from "@/pages/client"
import DashboardPage from "@/pages/dashboard"
import InvoicePage from "@/pages/invoice"
import ProductsPage from "@/pages/products"
import ReportsPage from "@/pages/reports"
import SettingsPage from "@/pages/settings"
import TransactionPage from "@/pages/transaction"
import TaxPage from "@/pages/tax"
import AIAgentPage from "@/pages/ai-agent"
import BranchesPage from "@/pages/branches"
import ImagesPage from "@/pages/images"
import QrStatisticsPage from "@/pages/qr-statistics"
import { useRealtimeSync } from "@/hooks/use-realtime-sync"
import { cn } from "@/lib/utils"

// ─── Inner layout content (reads NavModeContext) ──────────────────────────────

function AppLayoutContent({
  activeUrl,
  mainItems,
  handleNavigate,
}: {
  activeUrl: string
  mainItems: typeof appNavigation.mainItems
  handleNavigate: (url: string) => void
}) {
  const { navMode } = useNavMode()

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        activeUrl={activeUrl}
        brand={appNavigation.brand}
        mainItems={mainItems}
        onNavigate={handleNavigate}
        planSections={appNavigation.planSections}
        quickActions={appNavigation.quickActions}
        secondaryItems={appNavigation.secondaryItems}
        user={appNavigation.user}
        variant="inset"
      />
      <SidebarInset>
        <SiteHeader
          activeUrl={activeUrl}
          breadcrumbLabels={appNavigation.breadcrumbLabels}
          onNavigate={handleNavigate}
          actions={<NotificationBell onNavigate={handleNavigate} />}
        />
        {/* Main content area — adds bottom padding on mobile when navbar is active
            so page content is never obscured by the two-row navbar (~96px)        */}
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col",
            navMode === "navbar" ? "max-md:pb-24" : ""
          )}
        >
          <Outlet />
        </div>
        {/* Mobile bottom navbar — only renders when navMode === "navbar" */}
        <MobileNavbar />
      </SidebarInset>
    </SidebarProvider>
  )
}

// ─── Inner layout (rendered only when authenticated) ─────────────────────────

function AppLayout() {
  useRealtimeSync()
  const location = useLocation()
  const navigate = useNavigate()
  const activeUrl = location.pathname === "/" ? "/dashboard" : location.pathname

  const handleNavigate = React.useCallback(
    (url: string) => {
      navigate(url)
    },
    [navigate]
  )

  // Pending-count badge on the Transaction sidebar item
  const { stats } = useTransactionStats()
  const pendingCount = stats?.pending_count ?? 0

  const mainItems = React.useMemo(() => {
    return appNavigation.mainItems.map((item) => {
      if (item.title === "Transaction" && pendingCount > 0) {
        return {
          ...item,
          badge: pendingCount,
          badgeVariant: "amber" as const,
        }
      }
      return item
    })
  }, [pendingCount])

  return (
    <NavModeProvider>
      <AppLayoutContent
        activeUrl={activeUrl}
        mainItems={mainItems}
        handleNavigate={handleNavigate}
      />
    </NavModeProvider>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AnimationProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard"      element={<DashboardPage />} />
              <Route path="products"       element={<ProductsPage />} />
              <Route path="tax"            element={<TaxPage />} />
              <Route path="ai-agent"       element={<AIAgentPage />} />
              <Route path="branches"       element={<BranchesPage />} />
              <Route path="images"         element={<ImagesPage />} />
              <Route path="qr-statistics"  element={<QrStatisticsPage />} />
              <Route path="transaction"    element={<TransactionPage />} />
              <Route path="invoice"        element={<InvoicePage />} />
              <Route path="client"         element={<ClientPage />} />
              <Route path="reports"        element={<ReportsPage />} />
              <Route path="settings"       element={<SettingsPage />} />
              <Route path="*"              element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </AnimationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
