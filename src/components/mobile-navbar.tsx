import * as React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  CalendarCheck2Icon,
  ChevronUpIcon,
  FileChartColumnIcon,
  HardHatIcon,
  ImageIcon,
  LayoutGridIcon,
  PackageIcon,
  PrinterIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useNavMode } from "@/contexts/nav-mode-context"
import { useAuth } from "@/contexts/auth-context"

// ── Navigation Items Configuration ──────────────────────────────────────────

// Primary bottom row (always visible dock) — 4 items (~80% width) + toggle button (~20% width)
const PRIMARY_NAV_ITEMS = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutGridIcon },
  { title: "Products", url: "/products", icon: PackageIcon },
  { title: "Clients", url: "/clients", icon: UsersIcon },
  { title: "Reports", url: "/reports", icon: FileChartColumnIcon },
] as const

// Secondary top row (expandable above) — 5 items (100% full width)
const SECONDARY_NAV_ITEMS = [
  { title: "Events", url: "/events", icon: CalendarCheck2Icon },
  { title: "Stickers", url: "/stickers", icon: PrinterIcon },
  { title: "Images", url: "/images", icon: ImageIcon },
  { title: "Workers", url: "/workers", icon: HardHatIcon },
  { title: "Settings", url: "/settings", icon: SettingsIcon },
] as const

// ── Input Focus Hook ────────────────────────────────────────────────────────
// Detects if user is currently typing to prevent mobile keyboard overlaps
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

// ── NavItem Button Component ────────────────────────────────────────────────
interface NavItemProps {
  title: string
  url: string
  icon: React.ElementType
  active: boolean
  onClick: () => void
}

function NavItem({ title, icon: Icon, active, onClick }: NavItemProps) {
  return (
    <button
      type="button"
      aria-label={title}
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center justify-center py-1.5 px-0.5 rounded-[15px] transition-all duration-200 cursor-pointer select-none",
        active
          ? "text-primary bg-primary/10 font-semibold"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/40 font-normal"
      )}
    >
      <Icon
        className={cn("size-[18px] transition-transform duration-200", active && "scale-110")}
        strokeWidth={active ? 2.25 : 1.75}
      />
      <span
        className={cn(
          "text-[10px] mt-0.5 leading-none transition-all duration-200 truncate max-w-full px-0.5",
          active ? "font-semibold text-primary" : "font-normal text-muted-foreground/80"
        )}
      >
        {title}
      </span>
    </button>
  )
}

/**
 * Purpose: Connected Dock Mobile Navbar (V2)
 * Features:
 *   - Swapped structure: Persistent primary 80/20 bar is on the BOTTOM; expandable secondary bar expands ABOVE.
 *   - Unified background styling between top and bottom bars.
 *   - Dynamic toggle button height: Matches the bottom bar height when collapsed; returns to compact height when expanded to leave a standalone gap.
 *   - Invert border-radius removed for a crisp, modern border seam.
 *   - Compatible with light and dark mode CSS variables.
 */
export function MobileNavbar() {
  const { navbarEnabled, topRowVisible, toggleTopRow } = useNavMode()
  const { role } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isInputFocused = useIsInputFocused()

  const secondaryNavItems = React.useMemo(() => {
    if (role === "worker") {
      return SECONDARY_NAV_ITEMS.filter((item) => item.url !== "/workers")
    }
    return SECONDARY_NAV_ITEMS
  }, [role])

  if (!navbarEnabled) {
    return null
  }

  const active = (url: string) =>
    location.pathname === url ||
    (url === "/dashboard" && location.pathname === "/") ||
    (url !== "/dashboard" && (location.pathname.startsWith(`${url}/`) || location.pathname.startsWith(`${url}?`)))

  function go(url: string) {
    navigate(url)
  }

  const isOpen = topRowVisible

  return (
    <div
      aria-label="Mobile navigation dock"
      className={cn(
        "fixed left-1/2 -translate-x-1/2 bottom-3.5 z-40 md:hidden select-none",
        "w-[min(420px,calc(100%-20px))]",
        "transition-all duration-300 ease-in-out",
        isInputFocused && "translate-y-28 opacity-0 pointer-events-none"
      )}
    >
      <div className="flex flex-col gap-0 w-full relative">

        {/* ── Secondary Level 2 Bar (Expands Above) ────────────────────── */}
        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] relative z-10",
            isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"
          )}
        >
          <div className="overflow-hidden">
            <div
              className={cn(
                "w-full h-[62px] p-1.5 grid grid-cols-5 gap-1 items-center",
                "bg-card/95 backdrop-blur-xl border border-border/80 text-foreground",
                "shadow-[var(--mobile-nav-shadow)]",
                "rounded-t-[22px] rounded-br-[22px] rounded-bl-none",
                // Seam patch at bottom left to seamlessly connect with main bar below
                "border-b-0"
              )}
            >
              {secondaryNavItems.map((item) => (
                <NavItem
                  key={item.url}
                  title={item.title}
                  url={item.url}
                  icon={item.icon}
                  active={active(item.url)}
                  onClick={() => go(item.url)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Primary Level 1 Row (Always Visible at Bottom) ───────────── */}
        <div className="flex items-end gap-2 w-full relative z-20">

          {/* Main Bar (78% width) */}
          <div
            className={cn(
              "w-[calc(78%-4px)] min-w-0 h-[62px] p-1.5 grid grid-cols-4 gap-1 items-center",
              "bg-card/95 backdrop-blur-xl border border-border/80 text-foreground",
              "shadow-[var(--mobile-nav-shadow)]",
              "transition-[border-radius,border-color] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
              isOpen
                ? "rounded-b-[22px] rounded-t-none border-t-0"
                : "rounded-[22px]"
            )}
          >
            {PRIMARY_NAV_ITEMS.map((item) => (
              <NavItem
                key={item.url}
                title={item.title}
                url={item.url}
                icon={item.icon}
                active={active(item.url)}
                onClick={() => go(item.url)}
              />
            ))}
          </div>

          {/* Standalone Toggle Bar (22% width) */}
          <div
            className={cn(
              "w-[calc(22%-4px)] shrink-0 flex items-center justify-center p-1.5 self-end",
              "bg-card/95 backdrop-blur-xl border border-border/80 text-foreground",
              "shadow-[var(--mobile-nav-shadow)] rounded-[22px]",
              "transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
              // Collapsed: same height as main bar (62px)
              // Expanded: normal / compact height (52px) leaving a gap above
              isOpen ? "h-[52px]" : "h-[62px]"
            )}
          >
            <button
              type="button"
              onClick={toggleTopRow}
              aria-expanded={isOpen}
              aria-label={isOpen ? "Sembunyikan menu level 2" : "Tampilkan menu level 2"}
              className={cn(
                "w-full h-full flex items-center justify-center rounded-[16px]",
                "bg-muted/40 hover:bg-muted/70 text-foreground transition-all duration-200 active:scale-95 cursor-pointer"
              )}
            >
              <ChevronUpIcon
                className={cn(
                  "size-5 transition-transform duration-400 ease-[cubic-bezier(0.2,0.8,0.2,1)] text-foreground",
                  isOpen && "rotate-180"
                )}
                strokeWidth={2.5}
              />
            </button>
          </div>

        </div>

      </div>
    </div>
  )
}
