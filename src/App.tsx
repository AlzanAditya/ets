import * as React from "react"
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom"

import { ProtectedRoute } from "@/components/protected-route"
import { AuthProvider } from "@/contexts/auth-context"
import { AnimationProvider } from "@/contexts/animation-context"
import { TableDensityProvider } from "@/contexts/table-density-context"
import { BreadcrumbProvider } from "@/contexts/breadcrumb-context"

import { RoleGuard } from "@/components/auth/RoleGuard"
import { GuestGuard } from "@/components/auth/GuestGuard"
import type { UserRole } from "@/contexts/auth-context"

import {
  LoginPage,
  PublicLanding,
  PublicProductDetail,
  WorkerLayout,
  WorkerHome,
  WorkerTask,
  WorkerSchedule,
  WorkerHistory,
  WorkerProfile,
  AppLayout,
  DashboardPage,
  ProductsPage,
  StickersPage,
  ClientPage,
  TaxPage,
  AIAgentPage,
  WorkersPage,
  ImagesPage,
  QrStatisticsPage,
  TransactionPage,
  InvoicePage,
  ReportsPage,
  ReportSurveyPage,
  SettingsPage,
} from "@/lib/lazy-routes"

const ADMIN_ROLES: UserRole[] = ["admin", "super_admin"]
const WORKER_ROLES: UserRole[] = ["worker"]

// ─── Fallback Loading Component ──────────────────────────────────────────────

function RouteLoadingFallback() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="size-12 rounded-xl bg-primary/20 animate-pulse" />
        <div className="flex flex-col items-center gap-2">
          <div className="h-4 w-32 rounded bg-muted animate-pulse" />
          <div className="h-3 w-24 rounded bg-muted/60 animate-pulse" />
        </div>
      </div>
    </div>
  )
}

// ─── Root Application Component ──────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AnimationProvider>
          <TableDensityProvider>
            <BreadcrumbProvider>
              <React.Suspense fallback={<RouteLoadingFallback />}>
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
                  <Route path="/p" element={<PublicLanding />} />
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
                    <Route index element={<Navigate to="/worker/home" replace />} />
                    <Route path="home" element={<WorkerHome />} />
                    <Route path="task" element={<WorkerTask />} />
                    <Route path="schedule" element={<WorkerSchedule />} />
                    <Route path="history" element={<WorkerHistory />} />
                    <Route path="profile" element={<WorkerProfile />} />
                  </Route>

                  {/* Admin protected routes (Only for roles: admin, super_admin) */}
                  <Route
                    element={
                      <ProtectedRoute>
                        <RoleGuard allow={ADMIN_ROLES} redirectTo="/worker/home">
                          <AppLayout />
                        </RoleGuard>
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard"       element={<DashboardPage />} />
                    <Route path="admin/dashboard" element={<DashboardPage />} />
                    <Route path="products"        element={<ProductsPage />} />
                    <Route path="products/add"    element={<ProductsPage />} />
                    <Route path="products/:id"    element={<ProductsPage />} />
                    <Route path="admin/products"     element={<ProductsPage />} />
                    <Route path="admin/products/add" element={<ProductsPage />} />
                    <Route path="admin/products/:id" element={<ProductsPage />} />
                    <Route path="stickers"        element={<StickersPage />} />
                    <Route path="admin/stickers"  element={<StickersPage />} />
                    <Route path="product"         element={<Navigate to="/products" replace />} />
                    <Route path="product/add"     element={<Navigate to="/products/add" replace />} />
                    <Route path="product/:id"     element={<ProductsPage />} />
                    <Route path="admin/product/:id" element={<ProductsPage />} />
                    <Route path="clients"         element={<ClientPage />} />
                    <Route path="clients/add"     element={<ClientPage />} />
                    <Route path="clients/:id"     element={<ClientPage />} />
                    <Route path="admin/clients"     element={<ClientPage />} />
                    <Route path="admin/clients/add" element={<ClientPage />} />
                    <Route path="admin/clients/:id" element={<ClientPage />} />
                    <Route path="client"          element={<Navigate to="/clients" replace />} />
                    <Route path="client/add"      element={<Navigate to="/clients/add" replace />} />
                    <Route path="client/:id"      element={<ClientPage />} />
                    <Route path="tax"             element={<TaxPage />} />
                    <Route path="admin/tax"       element={<TaxPage />} />
                    <Route path="ai-agent"        element={<AIAgentPage />} />
                    <Route path="admin/ai-agent"   element={<AIAgentPage />} />
                    <Route path="workers"         element={<WorkersPage />} />
                    <Route path="workers/add"     element={<WorkersPage />} />
                    <Route path="workers/:id"     element={<WorkersPage />} />
                    <Route path="admin/workers"     element={<WorkersPage />} />
                    <Route path="admin/workers/add" element={<WorkersPage />} />
                    <Route path="admin/workers/:id" element={<WorkersPage />} />
                    <Route path="branches"        element={<Navigate to="/workers" replace />} />
                    <Route path="images"          element={<ImagesPage />} />
                    <Route path="admin/images"    element={<ImagesPage />} />
                    <Route path="qr-statistics"   element={<QrStatisticsPage />} />
                    <Route path="admin/qr-statistics" element={<QrStatisticsPage />} />
                    <Route path="transaction"     element={<TransactionPage />} />
                    <Route path="transaction/add" element={<TransactionPage />} />
                    <Route path="admin/transaction" element={<TransactionPage />} />
                    <Route path="invoice"         element={<InvoicePage />} />
                    <Route path="admin/invoice"   element={<InvoicePage />} />
                    <Route path="reports"         element={<ReportsPage />} />
                    <Route path="admin/reports"   element={<ReportsPage />} />
                    <Route path="reports/survey"  element={<ReportSurveyPage mode="survey" />} />
                    <Route path="reports/final-survey" element={<ReportSurveyPage mode="final" />} />
                    <Route path="admin/reports/survey" element={<ReportSurveyPage mode="survey" />} />
                    <Route path="admin/reports/final-survey" element={<ReportSurveyPage mode="final" />} />
                    <Route path="settings"        element={<SettingsPage />} />
                    <Route path="admin/settings"  element={<SettingsPage />} />
                    <Route path="admin"           element={<Navigate to="/dashboard" replace />} />
                    <Route path="admin/*"         element={<Navigate to="/dashboard" replace />} />
                    <Route path="*"               element={<Navigate to="/dashboard" replace />} />
                  </Route>
                </Routes>
              </React.Suspense>
            </BreadcrumbProvider>
          </TableDensityProvider>
        </AnimationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
