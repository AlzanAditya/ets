import { WorkerScheduleTimeline } from "@/components/worker/timeline/WorkerScheduleTimeline"
import { useWorkerData } from "@/hooks/use-worker-data"

export default function WorkerJadwal() {
  const { allTasks, loading } = useWorkerData()

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse pt-2">
        <div className="h-32 rounded-2xl bg-slate-900/60 border border-slate-800" />
        <div className="h-32 rounded-2xl bg-slate-900/60 border border-slate-800" />
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in pt-1">
      <WorkerScheduleTimeline schedules={allTasks} />
    </div>
  )
}
