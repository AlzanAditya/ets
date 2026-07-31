import * as React from "react"
import { RotateCcw, MapPin, Clock, ChevronRight, CheckCircle2, CircleDot } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { HistoryItem } from "../data/mock-worker-data"
export type { HistoryItem }
import { cn } from "@/lib/utils"

export interface HistoryTimelineProps {
  items: HistoryItem[]
  className?: string
}

export function HistoryTimeline({ items, className }: HistoryTimelineProps) {
  const [selectedItem, setSelectedItem] = React.useState<HistoryItem | null>(null)

  if (!items || items.length === 0) {
    return (
      <EmptyState
        icon={RotateCcw}
        title="Tidak ada riwayat"
        description="Riwayat pekerjaan yang telah selesai atau diperbarui akan dicatat di halaman ini."
      />
    )
  }

  // Group items by dateGroup
  const groupedItems = React.useMemo(() => {
    const groups: Record<string, HistoryItem[]> = {}
    items.forEach((item) => {
      const key = item.formattedDate || item.dateGroup || "Lainnya"
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    })
    return groups
  }, [items])

  return (
    <>
      <div className={cn("space-y-6", className)}>
        {Object.entries(groupedItems).map(([groupTitle, groupItems]) => (
          <div key={groupTitle} className="space-y-3">
            {/* Date Group Header */}
            <div className="text-xs font-bold text-slate-400">
              {groupTitle}
            </div>

            {/* Timeline Items List */}
            <div className="space-y-2.5">
              {groupItems.map((item) => {
                const isCompleted = item.status === "completed"
                const timeText = isCompleted
                  ? item.completedAt || item.time
                  : item.lastUpdated || item.time

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="rounded-xl border border-slate-800 bg-[#162028] p-3.5 shadow-xs space-y-2 hover:border-slate-700 transition-all cursor-pointer"
                  >
                    {/* Event Breadcrumb & Time */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        {/* Status Icon Indicator */}
                        {isCompleted ? (
                          <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                        ) : (
                          <CircleDot className="size-4 text-amber-500 shrink-0" />
                        )}

                        <span className="font-bold text-xs text-white">
                          {item.mainEvent}
                        </span>
                        <ChevronRight className="size-3 text-slate-400 shrink-0" />
                        <span className="font-bold text-xs text-emerald-400 truncate">
                          {item.stepEvent}
                        </span>
                      </div>

                      <span className="text-[11px] font-mono text-slate-400 shrink-0 flex items-center gap-1">
                        <Clock className="size-3 text-slate-400" />
                        <span>{timeText}</span>
                      </span>
                    </div>

                    {/* Client & Serial Number */}
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-200 truncate">
                        {item.clientName}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400 shrink-0">
                        {item.serialNumber}
                      </span>
                    </div>

                    {/* Address Location */}
                    <div className="flex items-start gap-1 text-[11px] text-slate-400 pt-0.5 border-t border-slate-800/80">
                      <MapPin className="size-3 text-rose-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{item.address}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Detail Dialog on click */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        {selectedItem && (
          <DialogContent className="max-w-md rounded-2xl bg-slate-900 border-slate-800 text-slate-100">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base text-white">
                <span>{selectedItem.clientName}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Detail riwayat pekerjaan teknis ETS.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs py-2">
              <div className="rounded-xl bg-slate-800/80 p-3 space-y-2 border border-slate-700/60">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Main Event:</span>
                  <span className="font-bold text-white">{selectedItem.mainEvent}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Step Event:</span>
                  <span className="font-bold text-emerald-400">{selectedItem.stepEvent}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Serial Number:</span>
                  <span className="font-mono font-bold text-white">{selectedItem.serialNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Status:</span>
                  <span className={selectedItem.status === "completed" ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                    {selectedItem.status === "completed" ? "Selesai" : "Sedang Berlangsung"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Waktu:</span>
                  <span className="font-mono text-slate-300">{selectedItem.time}</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 p-3 space-y-1 bg-slate-950/40">
                <div className="font-semibold text-white">Alamat Klien:</div>
                <div className="text-slate-400 text-[11px]">{selectedItem.address}</div>
              </div>
            </div>

            <DialogFooter>
              <Button size="sm" variant="outline" onClick={() => setSelectedItem(null)} className="w-full rounded-xl border-slate-700 text-slate-200 hover:bg-slate-800">
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}

