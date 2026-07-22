import * as React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  FileChartColumnIcon,
  ImageIcon,
  LayoutGridIcon,
  PackageIcon,
  ReceiptIcon,
  ScanQrCodeIcon,
  SettingsIcon,
  UsersIcon,
  Wallet2Icon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useNavMode } from "@/contexts/nav-mode-context"

// ── Constants ────────────────────────────────────────────────────────────────

const ROW_H = 48 // px — height of each row

// Top row (collapsible) — 4 items, chevron takes the 5th visual slot
const TOP_NAV_ITEMS = [
  { title: "QR Statistics", url: "/qr-statistics", icon: ScanQrCodeIcon },
  { title: "Transaction", url: "/transaction", icon: Wallet2Icon },
  { title: "Images", url: "/images", icon: ImageIcon },
  { title: "Invoice", url: "/invoice", icon: ReceiptIcon },
] as const

// Bottom row (always visible) — 5 items
const BOTTOM_NAV_ITEMS = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutGridIcon },
  { title: "Products", url: "/products", icon: PackageIcon },
  { title: "Clients", url: "/client", icon: UsersIcon },
  { title: "Reports", url: "/reports", icon: FileChartColumnIcon },
  { title: "Settings", url: "/settings", icon: SettingsIcon },
] as const

// ── Input Focus hook ────────────────────────────────────────────────────────
// Detects if user is currently typing in an input or textarea on mobile
// so we can hide the navbar and prevent it from floating up over inputs.

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

// ── NavItem button ──────────────────────────────────────────────────────────

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
        "flex flex-1 flex-col items-center justify-center py-1 transition-colors duration-150",
        active
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground active:text-primary"
      )}
    >
      <Icon
        className={cn("size-[18px] transition-transform duration-150", active && "scale-105")}
        strokeWidth={active ? 2.25 : 1.75}
      />
      <span
        className={cn(
          "text-[10px] mt-0.5 leading-none transition-all duration-150 select-none",
          active ? "font-semibold text-primary" : "font-light text-muted-foreground/60"
        )}
      >
        {title}
      </span>
    </button>
  )
}

// ── MobileNavbar ────────────────────────────────────────────────────────────

/**
 * Purpose: mobile-only bottom navigation bar with two rows and collapse animation.
 * Responsibilities:
 *   – Render top row (QR Statistics, Transaction, Images, Invoice) that slides
 *     from behind the bottom row like a card appearing from behind.
 *   – Render bottom row (Dashboard, Products, Clients, Reports, Settings) always
 *     visible.
 *   – Float a ChevronUp/Down pill at a fixed screen position regardless of
 *     top-row state.
 *   – Stay fixed to the actual bottom of the screen even when the virtual
 *     keyboard is open (uses visualViewport API).
 * Usage notes: only visible on mobile (md:hidden); only rendered when navMode === "navbar".
 */
export function MobileNavbar() {
  const { navbarEnabled, topRowVisible, toggleTopRow } = useNavMode()
  const navigate = useNavigate()
  const location = useLocation()
  const isInputFocused = useIsInputFocused()

  if (!navbarEnabled) {
    return null
  }

  const active = (url: string) =>
    location.pathname === url || (url === "/dashboard" && location.pathname === "/")

  function go(url: string) {
    navigate(url)
  }

  // The chevron pill is positioned ABOVE the bottom row at a fixed offset.
  // `bottom: ROW_H + 6` keeps it visually anchored regardless of top-row state.
  const chevronBottom = ROW_H + 6

  return (
    <div
      aria-label="Mobile navigation"
      className={cn(
        "fixed left-0 right-0 bottom-0 z-40 md:hidden select-none transition-all duration-300 ease-in-out",
        isInputFocused && "translate-y-full opacity-0 pointer-events-none"
      )}
    >
      {/* ── Outer shell (position:relative so absolute children are anchored) */}
      <div className="relative">

        {/* ── Top row ─────────────────────────────────────────────────────
            • z-index 10 (below bottom row z-20) so it animates FROM BEHIND.
            • Starts at bottom=ROW_H (flush above bottom row).
            • translateY(100%) = slides down behind bottom row (collapsed).
            • translateY(0)    = slides up to visible position (expanded).
            • cubic-bezier gives a spring-like "reveal from behind" feel.          */}
        <div
          aria-hidden={!topRowVisible}
          className={cn(
            "absolute left-0 right-0 z-10",
            "flex items-stretch",
            "border-t border-border/40 bg-background/95 backdrop-blur-md",
            "transition-transform",
          )}
          style={{
            bottom: ROW_H,
            height: ROW_H,
            transitionDuration: "320ms",
            transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)",
            transform: topRowVisible ? "translateY(0)" : "translateY(100%)",
            // Ensure the row can visually overlap behind bottom row
            willChange: "transform",
          }}
        >
          {TOP_NAV_ITEMS.map((item) => (
            <NavItem
              key={item.url}
              title={item.title}
              url={item.url}
              icon={item.icon}
              active={active(item.url)}
              onClick={() => go(item.url)}
            />
          ))}
          {/* Empty flex slot — lines up with chevron in bottom row area */}
          <div className="flex-1" />
        </div>

        {/* ── Floating Chevron ────────────────────────────────────────────
            Always at the same screen position: right edge, just above the
            bottom row. z-index 30 keeps it above both rows at all times.    */}
        <button
          type="button"
          aria-label={topRowVisible ? "Sembunyikan menu atas" : "Tampilkan menu atas"}
          onClick={toggleTopRow}
          className={cn(
            "absolute right-8 z-30 mb-1",
            "flex size-7 items-center justify-center rounded-full",
            "border border-border/85 bg-background shadow-md",
            "text-muted-foreground transition-colors hover:text-foreground",
            "hover:border-border active:scale-95 transition-all duration-150"
          )}
          style={{ bottom: chevronBottom }}
        >
          {topRowVisible
            ? <ChevronDownIcon className="size-5" strokeWidth={2.5} />
            : <ChevronUpIcon className="size-5" strokeWidth={2.5} />
          }
        </button>

        {/* ── Bottom row ──────────────────────────────────────────────────
            z-index 20 (above top row z-10) — the top row slides out from
            BEHIND this row. Always visible.                                 */}
        <div
          className={cn(
            "relative z-20",
            "flex items-stretch",
            "border-t border-border/40 bg-background/95 backdrop-blur-md",
          )}
          style={{ height: ROW_H }}
        >
          {BOTTOM_NAV_ITEMS.map((item) => (
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
  )
}
