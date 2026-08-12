import * as React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { House, ClipboardList, Calendar, RotateCcw, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"
import { preloadRoute } from "@/lib/lazy-routes"

function useIsInputFocused(): boolean {
  const [isFocused, setIsFocused] = React.useState(false)

  React.useEffect(() => {
    function handleFocusChange() {
      const activeEl = document.activeElement
      const isInput =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.tagName === "SELECT" ||
          activeEl.getAttribute("contenteditable") === "true")
      setIsFocused(Boolean(isInput))
    }

    document.addEventListener("focusin", handleFocusChange)
    document.addEventListener("focusout", handleFocusChange)

    return () => {
      document.removeEventListener("focusin", handleFocusChange)
      document.removeEventListener("focusout", handleFocusChange)
    }
  }, [])

  return isFocused
}

const WORKER_NAV_ITEMS = [
  { title: "Beranda", url: "/worker/home", icon: House },
  { title: "Tugas", url: "/worker/task", icon: ClipboardList },
  { title: "Jadwal", url: "/worker/schedule", icon: Calendar },
  { title: "Riwayat", url: "/worker/history", icon: RotateCcw },
  { title: "Profil", url: "/worker/profile", icon: UserRound },
] as const

export function WorkerBottomNavigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const isInputFocused = useIsInputFocused()

  const isActive = (url: string) => {
    if (url === "/worker/home") {
      return (
        location.pathname === "/worker/home" ||
        location.pathname === "/worker/beranda" ||
        location.pathname === "/worker" ||
        location.pathname === "/worker/"
      )
    }
    return location.pathname === url || location.pathname.startsWith(`${url}/`)
  }

  return (
    <div
      aria-label="Worker bottom navigation"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 select-none border-t border-border bg-card/95 backdrop-blur-md transition-all duration-200",
        isInputFocused && "translate-y-full opacity-0 pointer-events-none"
      )}
    >
      <div className="flex h-14 items-center justify-around px-2 max-w-md mx-auto">
        {WORKER_NAV_ITEMS.map((item) => {
          const active = isActive(item.url)
          const Icon = item.icon
          return (
            <button
              key={item.url}
              type="button"
              onMouseEnter={() => preloadRoute(item.url)}
              onTouchStart={() => preloadRoute(item.url)}
              onClick={() => navigate(item.url)}
              className={cn(
                "flex flex-1 flex-col items-center justify-center py-1 transition-colors duration-150 active:scale-95",
                active
                  ? "text-accent-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform duration-150",
                  active && "scale-110"
                )}
                strokeWidth={active ? 2.25 : 1.75}
                fill={active ? "currentColor" : "none"}
                fillOpacity={active ? 0.4 : undefined}
              />
              <span
                className={cn(
                  "text-[10px] mt-1 leading-none select-none",
                  active ? "font-semibold text-accent-foreground" : "text-muted-foreground"
                )}
              >
                {item.title}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
