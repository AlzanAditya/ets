import { Outlet } from "react-router-dom"
import { WorkerHeader } from "./WorkerHeader"
import { WorkerBottomNavigation } from "./WorkerBottomNavigation"
import { WorkerDataProvider } from "@/contexts/worker-data-context"

export function WorkerLayout() {
  return (
    <WorkerDataProvider>
      <div className="dark min-h-screen bg-[#0a1316] text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">
        {/* Global Header for Worker */}
        <WorkerHeader />

        {/* Main Content Area */}
        <main className="mx-auto max-w-md px-4 py-2 pb-24 space-y-4">
          <Outlet />
        </main>

        {/* Global Bottom Navigation */}
        <WorkerBottomNavigation />
      </div>
    </WorkerDataProvider>
  )
}
