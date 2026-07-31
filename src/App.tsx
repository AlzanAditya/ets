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
import { TableDensityProvider } from "@/contexts/table-density-context"
import { NavModeProvider, useNavMode } from "@/contexts/nav-mode-context"
import { useTransactionStats } from "@/hooks/use-transactions"
import { BreadcrumbProvider } from "@/contexts/breadcrumb-context"
import { cn } from "@/lib/utils"
import LoginPage from "@/pages/auth/Login"
import ClientPage from "@/pages/admin/client"
import DashboardPage from "@/pages/admin/dashboard"
import InvoicePage from "@/pages/admin/invoice"
import ProductsPage from "@/pages/admin/products"
import ReportsPage from "@/pages/admin/reports"
import SettingsPage from "@/pages/admin/settings"
import TransactionPage from "@/pages/admin/transaction"
import TaxPage from "@/pages/admin/tax"
import AIAgentPage from "@/pages/admin/ai-agent"
import WorkersPage from "@/pages/admin/workers"
import ImagesPage from "@/pages/admin/images"
import QrStatisticsPage from "@/pages/admin/qr-statistics"
import PublicProductDetail from "@/pages/public/ProductDetail"
import { useRealtimeSync } from "@/hooks/use-realtime-sync"

import { WorkerLayout } from "@/components/worker/layout/WorkerLayout"
import WorkerBeranda from "@/pages/worker/Beranda"
import WorkerJadwal from "@/pages/worker/Jadwal"
import WorkerPekerjaan from "@/pages/worker/Pekerjaan"
import WorkerHistori from "@/pages/worker/Histori"
import WorkerProfil from "@/pages/worker/Profil"

import { RoleGuard } from "@/components/auth/RoleGuard"
import { GuestGuard } from "@/components/auth/GuestGuard"
import { useAuth, type UserRole } from "@/contexts/auth-context"

const ADMIN_ROLES: UserRole[] = ["admin", "super_admin"]
const WORKER_ROLES: UserRole[] = ["worker"]

// ─── Inner layout content ──────────────────────────────

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
  const { sidebarEnabled, navbarEnabled } = useNavMode()

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      {sidebarEnabled && (
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
        {/* Main content area — adds bottom padding on mobile when navbar is active
            so page content is never obscured by the two-row navbar (~96px)        */}
        <div className={cn("flex min-w-0 flex-1 flex-col", navbarEnabled && "max-md:pb-24")}>
          <Outlet />
        </div>
        {/* Mobile bottom navbar */}
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
  const { role, profile, user } = useAuth()

  const handleNavigate = React.useCallback(
    (url: string) => {
      navigate(url)
    },
    [navigate]
  )

  // Pending-count badge on the Transaction sidebar item
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

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AnimationProvider>
          <TableDensityProvider>
            <BreadcrumbProvider>
              <Routes>
                {/* Public & Auth routes */}
                <Route
                  path="/login"
                  element={
                    <GuestGuard>
                      <LoginPage />
                    </GuestGuard>
                  }
                />
                <Route path="/p/:serial_number" element={<PublicProductDetail />} />

                {/* Worker App standalone layout routes (Only for role: worker) */}
                <Route
                  path="/worker"
                  element={
                    <ProtectedRoute>
                      <RoleGuard allow={WORKER_ROLES} redirectTo="/dashboard">
                        <WorkerLayout />
                      </RoleGuard>
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/worker/beranda" replace />} />
                  <Route path="beranda" element={<WorkerBeranda />} />
                  <Route path="jadwal" element={<WorkerJadwal />} />
                  <Route path="tugas" element={<WorkerPekerjaan />} />
                  <Route path="pekerjaan" element={<WorkerPekerjaan />} />
                  <Route path="riwayat" element={<WorkerHistori />} />
                  <Route path="histori" element={<WorkerHistori />} />
                  <Route path="profil" element={<WorkerProfil />} />
                </Route>

                {/* Admin protected routes (Only for roles: admin, super_admin) */}
                <Route
                  element={
                    <ProtectedRoute>
                      <RoleGuard allow={ADMIN_ROLES} redirectTo="/worker/beranda">
                        <AppLayout />
                      </RoleGuard>
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard"       element={<DashboardPage />} />
                  <Route path="products"        element={<ProductsPage />} />
                  <Route path="products/add"    element={<ProductsPage />} />
                  <Route path="products/:id"    element={<ProductsPage />} />
                  <Route path="product"         element={<Navigate to="/products" replace />} />
                  <Route path="product/add"     element={<Navigate to="/products/add" replace />} />
                  <Route path="product/:id"     element={<ProductsPage />} />
                  <Route path="clients"         element={<ClientPage />} />
                  <Route path="clients/add"     element={<ClientPage />} />
                  <Route path="clients/:id"     element={<ClientPage />} />
                  <Route path="client"          element={<Navigate to="/clients" replace />} />
                  <Route path="client/add"      element={<Navigate to="/clients/add" replace />} />
                  <Route path="client/:id"      element={<ClientPage />} />
                  <Route path="tax"             element={<TaxPage />} />
                  <Route path="ai-agent"        element={<AIAgentPage />} />
                  <Route path="workers"         element={<WorkersPage />} />
                  <Route path="workers/add"     element={<WorkersPage />} />
                  <Route path="workers/:id"     element={<WorkersPage />} />
                  <Route path="branches"        element={<Navigate to="/workers" replace />} />
                  <Route path="images"          element={<ImagesPage />} />
                  <Route path="qr-statistics"   element={<QrStatisticsPage />} />
                  <Route path="transaction"     element={<TransactionPage />} />
                  <Route path="transaction/add" element={<TransactionPage />} />
                  <Route path="invoice"         element={<InvoicePage />} />
                  <Route path="reports"         element={<ReportsPage />} />
                  <Route path="settings"        element={<SettingsPage />} />
                  <Route path="admin"           element={<Navigate to="/dashboard" replace />} />
                  <Route path="admin/*"         element={<Navigate to="/dashboard" replace />} />
                  <Route path="*"               element={<Navigate to="/dashboard" replace />} />
                </Route>
              </Routes>
            </BreadcrumbProvider>
          </TableDensityProvider>
        </AnimationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
