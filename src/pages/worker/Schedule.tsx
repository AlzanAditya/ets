import { WorkerScheduleTimeline } from "@/components/worker/timeline/WorkerScheduleTimeline"
import { useWorkerData } from "@/hooks/use-worker-data"

export default function WorkerSchedule() {
  const { allTasks, loading } = useWorkerData()

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse pt-2">
        <div className="h-32 rounded-2xl bg-card/60 border border-border" />
        <div className="h-32 rounded-2xl bg-card/60 border border-border" />
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in pt-1">
      <WorkerScheduleTimeline schedules={allTasks} />
    </div>
  )
}
