import * as React from "react"
import { Outlet } from "react-router-dom"
import { WorkerHeader } from "./WorkerHeader"
import { WorkerBottomNavigation } from "./WorkerBottomNavigation"
import { WorkerDataProvider } from "@/contexts/worker-data-context"
import { preloadAllWorkerRoutes } from "@/lib/lazy-routes"

function WorkerPageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-28 rounded-2xl bg-slate-800/50 border border-slate-800" />
      <div className="h-44 rounded-2xl bg-slate-800/50 border border-slate-800" />
      <div className="h-32 rounded-2xl bg-slate-800/50 border border-slate-800" />
    </div>
  )
}

export function WorkerLayout() {
  React.useEffect(() => {
    preloadAllWorkerRoutes()
  }, [])

  return (
    <WorkerDataProvider>
      <div className="dark min-h-screen bg-[#0a1316] text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">
        {/* Global Header for Worker */}
        <WorkerHeader />

        {/* Main Content Area */}
        <main className="mx-auto max-w-md px-4 py-2 pb-24 space-y-4">
          <React.Suspense fallback={<WorkerPageSkeleton />}>
            <Outlet />
          </React.Suspense>
        </main>

        {/* Global Bottom Navigation */}
        <WorkerBottomNavigation />
      </div>
    </WorkerDataProvider>
  )
}

export default WorkerLayout
