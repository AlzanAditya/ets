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
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { appNavigation } from "@/config/navigation"
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

function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const activeUrl = location.pathname === "/" ? "/dashboard" : location.pathname

  const handleNavigate = React.useCallback(
    (url: string) => {
      navigate(url)
    },
    [navigate]
  )

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
        mainItems={appNavigation.mainItems}
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
        />
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="tax" element={<TaxPage />} />
          <Route path="ai-agent" element={<AIAgentPage />} />
          <Route path="branches" element={<BranchesPage />} />
          <Route path="images" element={<ImagesPage />} />
          <Route path="qr-statistics" element={<QrStatisticsPage />} />
          <Route path="transaction" element={<TransactionPage />} />
          <Route path="invoice" element={<InvoicePage />} />
          <Route path="client" element={<ClientPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
