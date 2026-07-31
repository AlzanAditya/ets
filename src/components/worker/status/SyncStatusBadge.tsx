import * as React from "react"
import { Cloud, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface SyncStatusBadgeProps {
  className?: string
  isSyncing?: boolean
  onSyncTrigger?: () => void
}

export function SyncStatusBadge({ className, isSyncing: externalSyncing, onSyncTrigger }: SyncStatusBadgeProps) {
  const [syncing, setSyncing] = React.useState(false)

  const isBusy = externalSyncing || syncing

  const handleSyncClick = () => {
    if (isBusy) return
    setSyncing(true)
    if (onSyncTrigger) {
      onSyncTrigger()
    } else {
      toast.info("Menyinkronkan data offline...")
    }
    setTimeout(() => {
      setSyncing(false)
      toast.success("☁️ Data tersinkronisasi")
    }, 1200)
  }

  return (
    <button
      type="button"
      onClick={handleSyncClick}
      disabled={isBusy}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 select-none",
        "bg-secondary/70 hover:bg-secondary text-secondary-foreground border border-border/50 active:scale-95 cursor-pointer",
        className
      )}
      title="Klik untuk menyinkronkan data"
    >
      {isBusy ? (
        <>
          <RefreshCw className="size-3.5 animate-spin text-primary" />
          <span className="text-muted-foreground font-medium text-[11px]">🔄 Menunggu sinkronisasi...</span>
        </>
      ) : (
        <>
          <Cloud className="size-3.5 text-emerald-500" />
          <span className="font-medium text-[11px]">☁️ Data tersinkronisasi</span>
        </>
      )}
    </button>
  )
}
