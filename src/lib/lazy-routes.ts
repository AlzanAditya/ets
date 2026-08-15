import { lazyWithPreload } from "./lazy-preload"

// ─── Route Components with Preloading Capabilities ─────────────────────────

export const LoginPage = lazyWithPreload(() => import("@/pages/auth/Login"))

export const PublicLanding = lazyWithPreload(() => import("@/pages/public/PublicLanding"))
export const PublicProductDetail = lazyWithPreload(() => import("@/pages/public/ProductDetail"))

export const WorkerLayout = lazyWithPreload(() => import("@/components/worker/layout/WorkerLayout"))
export const WorkerHome = lazyWithPreload(() => import("@/pages/worker/Home"))
export const WorkerTask = lazyWithPreload(() => import("@/pages/worker/Task"))
export const WorkerSchedule = lazyWithPreload(() => import("@/pages/worker/Schedule"))
export const WorkerHistory = lazyWithPreload(() => import("@/pages/worker/History"))
export const WorkerProfile = lazyWithPreload(() => import("@/pages/worker/Profile"))

export const AppLayout = lazyWithPreload(() => import("@/components/admin/AppLayout"))
export const DashboardPage = lazyWithPreload(() => import("@/pages/admin/dashboard"))
export const ProductsPage = lazyWithPreload(() => import("@/pages/admin/products"))
export const StickersPage = lazyWithPreload(() => import("@/pages/admin/stickers"))
export const ClientPage = lazyWithPreload(() => import("@/pages/admin/client"))
export const TaxPage = lazyWithPreload(() => import("@/pages/admin/tax"))
export const AIAgentPage = lazyWithPreload(() => import("@/pages/admin/ai-agent"))
export const WorkersPage = lazyWithPreload(() => import("@/pages/admin/workers"))
export const ImagesPage = lazyWithPreload(() => import("@/pages/admin/images"))
export const QrStatisticsPage = lazyWithPreload(() => import("@/pages/admin/qr-statistics"))
export const TransactionPage = lazyWithPreload(() => import("@/pages/admin/transaction"))
export const InvoicePage = lazyWithPreload(() => import("@/pages/admin/invoice"))
export const ReportsPage = lazyWithPreload(() => import("@/pages/admin/reports"))
export const ReportSurveyPage = lazyWithPreload(() => import("@/pages/admin/reports/ReportSurveyPage"))
export const BeritaAcaraPage = lazyWithPreload(() => import("@/pages/admin/reports/BeritaAcaraPage"))
export const SettingsPage = lazyWithPreload(() => import("@/pages/admin/settings"))

// ─── URL to Preloader Registry ──────────────────────────────────────────────

const routePreloaders: Record<string, () => Promise<any>> = {
  "/dashboard": DashboardPage.preload,
  "/admin/dashboard": DashboardPage.preload,
  "/products": ProductsPage.preload,
  "/products/add": ProductsPage.preload,
  "/admin/products": ProductsPage.preload,
  "/stickers": StickersPage.preload,
  "/admin/stickers": StickersPage.preload,
  "/clients": ClientPage.preload,
  "/clients/add": ClientPage.preload,
  "/admin/clients": ClientPage.preload,
  "/tax": TaxPage.preload,
  "/admin/tax": TaxPage.preload,
  "/ai-agent": AIAgentPage.preload,
  "/admin/ai-agent": AIAgentPage.preload,
  "/workers": WorkersPage.preload,
  "/workers/add": WorkersPage.preload,
  "/admin/workers": WorkersPage.preload,
  "/images": ImagesPage.preload,
  "/admin/images": ImagesPage.preload,
  "/qr-statistics": QrStatisticsPage.preload,
  "/admin/qr-statistics": QrStatisticsPage.preload,
  "/transaction": TransactionPage.preload,
  "/admin/transaction": TransactionPage.preload,
  "/invoice": InvoicePage.preload,
  "/admin/invoice": InvoicePage.preload,
  "/reports": ReportsPage.preload,
  "/admin/reports": ReportsPage.preload,
  "/reports/survey": ReportSurveyPage.preload,
  "/reports/final-survey": ReportSurveyPage.preload,
  "/admin/reports/survey": ReportSurveyPage.preload,
  "/admin/reports/final-survey": ReportSurveyPage.preload,
  "/reports/berita-acara": BeritaAcaraPage.preload,
  "/admin/reports/berita-acara": BeritaAcaraPage.preload,
  "/settings": SettingsPage.preload,
  "/admin/settings": SettingsPage.preload,

  // Worker routes
  "/worker/home": WorkerHome.preload,
  "/worker/task": WorkerTask.preload,
  "/worker/schedule": WorkerSchedule.preload,
  "/worker/history": WorkerHistory.preload,
  "/worker/profile": WorkerProfile.preload,
}

/**
 * Preloads the chunk for a specific route path (e.g., when hovered or focused).
 */
export function preloadRoute(url: string) {
  if (!url) return
  const cleanUrl = url.split("?")[0].replace(/\/$/, "")
  const preloader = routePreloaders[cleanUrl] || routePreloaders[url]
  if (preloader) {
    preloader()
  }
}

/**
 * Background preloads all admin page chunks during browser idle time
 * after entering the admin layout.
 */
export function preloadAllAdminRoutes() {
  const adminPreloaders = [
    DashboardPage.preload,
    ProductsPage.preload,
    StickersPage.preload,
    ClientPage.preload,
    TaxPage.preload,
    AIAgentPage.preload,
    WorkersPage.preload,
    ImagesPage.preload,
    QrStatisticsPage.preload,
    TransactionPage.preload,
    InvoicePage.preload,
    ReportsPage.preload,
    ReportSurveyPage.preload,
    BeritaAcaraPage.preload,
    SettingsPage.preload,
  ]

  const runPreload = () => {
    adminPreloaders.forEach((preload) => {
      preload().catch(() => {})
    })
  }

  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(runPreload)
  } else {
    setTimeout(runPreload, 200)
  }
}

/**
 * Background preloads all worker page chunks during browser idle time
 * after entering the worker app.
 */
export function preloadAllWorkerRoutes() {
  const workerPreloaders = [
    WorkerHome.preload,
    WorkerTask.preload,
    WorkerSchedule.preload,
    WorkerHistory.preload,
    WorkerProfile.preload,
  ]

  const runPreload = () => {
    workerPreloaders.forEach((preload) => {
      preload().catch(() => {})
    })
  }

  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(runPreload)
  } else {
    setTimeout(runPreload, 200)
  }
}
