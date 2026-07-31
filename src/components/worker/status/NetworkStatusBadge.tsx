import * as React from "react"
import { cn } from "@/lib/utils"

interface NetworkStatusBadgeProps {
  className?: string
  showText?: boolean
}

export function NetworkStatusBadge({ className, showText = true }: NetworkStatusBadgeProps) {
  const [isOnline, setIsOnline] = React.useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  )

  React.useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
    }
    function handleOffline() {
      setIsOnline(false)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors",
        isOnline
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
          : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
        className
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full animate-pulse",
          isOnline ? "bg-emerald-500" : "bg-red-500"
        )}
      />
      {showText && <span>{isOnline ? "Online" : "Offline"}</span>}
    </div>
  )
}
