import * as React from "react"
import { TaskCard } from "@/components/worker/cards/TaskCard"
import { useWorkerData } from "@/hooks/use-worker-data"
import { EmptyState } from "@/components/empty-state"
import { ClipboardList } from "lucide-react"

export default function WorkerTask() {
  const { allTasks, loading } = useWorkerData()

  const renderCountRef = React.useRef(0)
  renderCountRef.current += 1
  console.log(`[WorkerTask] Render count: ${renderCountRef.current}`)

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse pt-2">
        <div className="h-40 rounded-2xl bg-card/60 border border-border" />
        <div className="h-40 rounded-2xl bg-card/60 border border-border" />
      </div>
    )
  }

  if (!allTasks || allTasks.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Tidak ada pekerjaan hari ini"
        description="Daftar penugasan instalasi dan maintenance lapangan akan muncul di halaman ini."
      />
    )
  }

  return (
    <div className="space-y-4 animate-fade-in pt-1">
      <div className="space-y-4">
        {allTasks.map((job) => (
          <TaskCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  )
}
