import { HistoryTimeline } from "@/components/worker/timeline/HistoryTimeline"
import { useWorkerData } from "@/hooks/use-worker-data"

export default function WorkerHistory() {
  const { historyItems, loading } = useWorkerData()

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
      <HistoryTimeline items={historyItems} />
    </div>
  )
}
