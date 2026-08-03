import { useNavigate } from "react-router-dom"
import { Calendar, MapPin } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { EmptyState } from "@/components/empty-state"
import type { WorkerJob } from "../data/mock-worker-data"
import { cn } from "@/lib/utils"

export interface NextScheduleCardProps {
  schedules: WorkerJob[]
  className?: string
}

export function NextScheduleCard({ schedules, className }: NextScheduleCardProps) {
  const navigate = useNavigate()

  // Max 3 schedules
  const visibleSchedules = schedules.slice(0, 3)

  if (!visibleSchedules || visibleSchedules.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="Tidak ada agenda"
        description="Jadwal pekerjaan teknis mendatang akan ditampilkan di sini."
      />
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold text-slate-300 tracking-tight">
          Jadwal Selanjutnya
        </h3>
        <button
          type="button"
          onClick={() => navigate("/worker/schedule")}
          className="text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer"
        >
          Lihat Semua
        </button>
      </div>

      <div className="space-y-2">
        {visibleSchedules.map((item) => {
          const initials = item.clientName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()

          return (
            <div
              key={item.id}
              onClick={() => navigate("/worker/schedule")}
              className="rounded-xl border border-slate-800 bg-[#162028] p-3 shadow-xs flex items-center gap-3 hover:border-slate-700 transition-colors cursor-pointer"
            >
              <Avatar className="size-10 rounded-full border border-slate-700 bg-slate-800 shrink-0">
                <AvatarImage src={item.clientLogo} alt={item.clientName} />
                <AvatarFallback className="font-bold text-xs bg-slate-800 text-slate-200">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-xs text-white truncate">
                    {item.clientName}
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono shrink-0 flex items-center gap-1">
                    <Calendar className="size-3 text-slate-400" />
                    <span>{item.scheduledDate || "30 Jul 2025"}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span className="font-mono text-slate-300 truncate">
                    {item.serialNumber}
                  </span>
                  <span className="truncate flex items-center gap-1 text-slate-400">
                    <MapPin className="size-3 text-rose-400 shrink-0" />
                    <span className="truncate">{item.location}</span>
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

