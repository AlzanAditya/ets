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
import { CLIENT_IDENTITY } from "@/config/client-identity"

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
            <div className="text-xs font-bold text-muted-foreground">
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
                    className="rounded-xl border border-border bg-card p-3.5 shadow-xs space-y-2 hover:border-primary/50 transition-all cursor-pointer text-card-foreground"
                  >
                    {/* Event Breadcrumb & Time */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        {/* Status Icon Indicator */}
                        {isCompleted ? (
                          <CheckCircle2 className="size-4 text-accent-foreground shrink-0" />
                        ) : (
                          <CircleDot className="size-4 text-amber-500 shrink-0" />
                        )}

                        <span className="font-bold text-xs text-foreground">
                          {item.mainEvent}
                        </span>
                        <ChevronRight className="size-3 text-muted-foreground shrink-0" />
                        <span className="font-bold text-xs text-accent-foreground truncate">
                          {item.stepEvent}
                        </span>
                      </div>

                      <span className="text-[11px] font-mono text-muted-foreground shrink-0 flex items-center gap-1">
                        <Clock className="size-3 text-muted-foreground" />
                        <span>{timeText}</span>
                      </span>
                    </div>

                    {/* Client & Serial Number */}
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-foreground truncate">
                        {item.clientName}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                        {item.serialNumber}
                      </span>
                    </div>

                    {/* Address Location */}
                    <div className="flex items-start gap-1 text-[11px] text-muted-foreground pt-0.5 border-t border-border/80">
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
          <DialogContent className="max-w-md rounded-2xl bg-card border-border text-card-foreground">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base text-foreground">
                <span>{selectedItem.clientName}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Detail riwayat pekerjaan teknis {CLIENT_IDENTITY.shortName}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs py-2">
              <div className="rounded-xl bg-muted/80 p-3 space-y-2 border border-border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Main Event:</span>
                  <span className="font-bold text-foreground">{selectedItem.mainEvent}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Step Event:</span>
                  <span className="font-bold text-accent-foreground">{selectedItem.stepEvent}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Serial Number:</span>
                  <span className="font-mono font-bold text-foreground">{selectedItem.serialNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Status:</span>
                  <span className={selectedItem.status === "completed" ? "text-accent-foreground font-bold" : "text-amber-400 font-bold"}>
                    {selectedItem.status === "completed" ? "Selesai" : "Sedang Berlangsung"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Waktu:</span>
                  <span className="font-mono text-muted-foreground">{selectedItem.time}</span>
                </div>
              </div>

              <div className="rounded-xl border border-border p-3 space-y-1 bg-background/40">
                <div className="font-semibold text-foreground">Alamat Klien:</div>
                <div className="text-muted-foreground text-[11px]">{selectedItem.address}</div>
              </div>
            </div>

            <DialogFooter>
              <Button size="sm" variant="outline" onClick={() => setSelectedItem(null)} className="w-full rounded-xl border-border text-foreground hover:bg-muted">
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}

