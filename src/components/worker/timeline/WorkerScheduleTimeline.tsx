import * as React from "react"
import { Clock, MapPin, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/empty-state"
import type { WorkerJob } from "../data/mock-worker-data"
import { cn } from "@/lib/utils"

export interface ScheduleTimelineGroup {
  dateLabel: string
  items: {
    id: string
    time: string
    mainEvent: string
    clientName: string
    location: string
    status: "On Progress" | "Scheduled" | "Completed"
  }[]
}

export interface WorkerScheduleTimelineProps {
  schedules?: WorkerJob[] | any[]
  className?: string
}

export function WorkerScheduleTimeline({ schedules: providedSchedules, className }: WorkerScheduleTimelineProps) {
  const groups: ScheduleTimelineGroup[] = React.useMemo(() => {
    if (!providedSchedules || providedSchedules.length === 0) {
      return []
    }

    const grouped: Record<string, ScheduleTimelineGroup["items"]> = {}
    providedSchedules.forEach((job: any) => {
      const dateKey = job.scheduledDate || job.dateGroup || "Mendatang"
      if (!grouped[dateKey]) grouped[dateKey] = []
      grouped[dateKey].push({
        id: job.id,
        time: job.scheduledTime || "08:30 WIB",
        mainEvent: job.mainEvent || "Instalasi",
        clientName: job.clientName,
        location: job.location || job.clientAddress || "-",
        status: job.status === "active" ? "On Progress" : "Scheduled",
      })
    })

    return Object.entries(grouped).map(([dateLabel, items]) => ({
      dateLabel,
      items,
    }))
  }, [providedSchedules])

  if (!groups || groups.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="Tidak ada agenda"
        description="Jadwal agenda kunjungan dan pemeliharaan lapangan akan muncul di halaman ini."
      />
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {groups.map((group) => (
        <div key={group.dateLabel} className="space-y-3">
          {/* Date Label Header */}
          <div className="text-xs font-bold text-muted-foreground">
            {group.dateLabel}
          </div>

          {/* Vertical Timeline Items */}
          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
            {group.items.map((item) => {
              const isOnProgress = item.status === "On Progress"
              const isScheduled = item.status === "Scheduled"
              const isCompleted = item.status === "Completed"

              return (
                <div key={item.id} className="relative group">
                  {/* Circle indicator on vertical line */}
                  <div
                    className={cn(
                      "absolute -left-6 top-1 size-4 rounded-full border-2 border-background flex items-center justify-center transition-all",
                      isOnProgress
                        ? "bg-primary ring-4 ring-primary/20"
                        : isCompleted
                        ? "bg-primary"
                        : "bg-background border-amber-500 border-2"
                    )}
                  >
                    {isOnProgress && <div className="size-1.5 rounded-full bg-background" />}
                    {isScheduled && <div className="size-1.5 rounded-full bg-amber-500" />}
                  </div>

                  {/* Content card */}
                  <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs space-y-2 text-card-foreground">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-muted-foreground flex items-center gap-1">
                          <Clock className="size-3 text-muted-foreground" />
                          <span>{item.time}</span>
                        </span>
                        <span className="text-xs font-bold text-foreground">
                          {item.mainEvent}
                        </span>
                      </div>

                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full",
                          isOnProgress && "bg-primary/10 text-accent-foreground border-primary/30",
                          isScheduled && "bg-amber-500/10 text-amber-400 border-amber-500/30",
                          isCompleted && "bg-primary/10 text-accent-foreground border-primary/30"
                        )}
                      >
                        {item.status}
                      </Badge>
                    </div>

                    <div className="text-xs text-foreground font-medium">
                      {item.clientName}
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="size-3 text-rose-400 shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
