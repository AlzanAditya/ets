import * as React from "react"
import { CurrentJobCard } from "@/components/worker/cards/CurrentJobCard"
import { NextScheduleCard } from "@/components/worker/cards/NextScheduleCard"
import { useWorkerData } from "@/hooks/use-worker-data"

export default function WorkerHome() {
  const { currentJob, nextSchedules, loading } = useWorkerData()

  const renderCountRef = React.useRef(0)
  renderCountRef.current += 1
  console.log(`[WorkerHome] Render count: ${renderCountRef.current}`)

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse pt-2">
        <div className="h-44 rounded-2xl bg-card/60 border border-border" />
        <div className="h-32 rounded-2xl bg-card/60 border border-border" />
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
