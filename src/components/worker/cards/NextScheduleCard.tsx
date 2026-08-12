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
        <h3 className="text-xs font-bold text-muted-foreground tracking-tight">
          Jadwal Selanjutnya
        </h3>
        <button
          type="button"
          onClick={() => navigate("/worker/schedule")}
          className="text-xs font-bold text-accent-foreground hover:underline cursor-pointer"
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
              className="rounded-xl border border-border bg-card text-card-foreground p-3 shadow-xs flex items-center gap-3 hover:border-primary/50 transition-colors cursor-pointer"
            >
              <Avatar className="size-10 rounded-full border border-border bg-muted shrink-0">
                <AvatarImage src={item.clientLogo} alt={item.clientName} />
                <AvatarFallback className="font-bold text-xs bg-muted text-muted-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-xs text-foreground truncate">
                    {item.clientName}
                  </h4>
                  <span className="text-[11px] text-muted-foreground font-mono shrink-0 flex items-center gap-1">
                    <Calendar className="size-3 text-muted-foreground" />
                    <span>{item.scheduledDate || "30 Jul 2025"}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <span className="font-mono text-foreground/90 truncate">
                    {item.serialNumber}
                  </span>
                  <span className="truncate flex items-center gap-1 text-muted-foreground">
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

