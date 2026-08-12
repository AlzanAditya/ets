import * as React from "react"
import { Outlet } from "react-router-dom"
import { WorkerHeader } from "./WorkerHeader"
import { WorkerBottomNavigation } from "./WorkerBottomNavigation"
import { WorkerDataProvider } from "@/contexts/worker-data-context"
import { preloadAllWorkerRoutes } from "@/lib/lazy-routes"

function WorkerPageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-28 rounded-2xl bg-muted/50 border border-border" />
      <div className="h-44 rounded-2xl bg-muted/50 border border-border" />
      <div className="h-32 rounded-2xl bg-muted/50 border border-border" />
    </div>
  )
}

export function WorkerLayout() {
  React.useEffect(() => {
    preloadAllWorkerRoutes()
  }, [])

  return (
    <WorkerDataProvider>
      <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
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
