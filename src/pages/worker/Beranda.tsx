import { CurrentJobCard } from "@/components/worker/cards/CurrentJobCard"
import { NextScheduleCard } from "@/components/worker/cards/NextScheduleCard"
import { useWorkerData } from "@/hooks/use-worker-data"

export default function WorkerBeranda() {
  const { currentJob, nextSchedules, loading } = useWorkerData()

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse pt-2">
        <div className="h-44 rounded-2xl bg-slate-900/60 border border-slate-800" />
        <div className="h-32 rounded-2xl bg-slate-900/60 border border-slate-800" />
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in pt-1">
      {/* Active Pekerjaan Card */}
      <section>
        <CurrentJobCard job={currentJob} />
      </section>

      {/* Jadwal Selanjutnya Card */}
      <section className="pt-1">
        <NextScheduleCard schedules={nextSchedules} />
      </section>
    </div>
  )
}
