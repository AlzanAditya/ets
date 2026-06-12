import * as React from "react"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { useNavMode } from "@/contexts/nav-mode-context"
import { cn } from "@/lib/utils"

function getBreadcrumbs(
  activeUrl: string,
  labels: Record<string, string>,
  defaultUrl: string
) {
  const pathname = activeUrl === "/" ? defaultUrl : activeUrl
  const segments = pathname.split("/").filter(Boolean)

  return segments.map((segment, index) => {
    const url = `/${segments.slice(0, index + 1).join("/")}`
    const label =
      labels[segment] ??
      segment
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")

    return { label, url }
  })
}

// ── Mobile nav-mode pill ─────────────────────────────────────────────────────

/**
 * Purpose: single cycling toggle visible only on mobile.
 * Displays the current navMode; clicking cycles to the next mode.
 */
function MobileNavToggle() {
  const { navMode, setNavMode } = useNavMode()

  const handleToggleNavMode = () => {
    setNavMode(navMode === "navbar" ? "sidebar" : "navbar")
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleToggleNavMode}
      className="md:hidden h-6 px-2 text-[12px] font-normal leading-none"
      aria-label={`Mode navigasi aktif: ${navMode}. Klik untuk berganti.`}
    >
      {navMode}
    </Button>
  )
}

// ── SiteHeader ────────────────────────────────────────────────────────────────

/**
 * Purpose: render the page header with sidebar trigger, breadcrumbs, and optional action slot.
 * Responsibilities: derive breadcrumb items from the active URL and labels.
 * Expected props: active URL, optional label map, navigation callback, and optional actions node.
 * Usage notes: generic fallback labels allow standalone development rendering.
 */
export function SiteHeader({
  activeUrl = "/dashboard",
  breadcrumbLabels = { dashboard: "Dashboard" },
  defaultUrl = "/dashboard",
  onNavigate,
  actions,
}: {
  activeUrl?: string
  breadcrumbLabels?: Record<string, string>
  defaultUrl?: string
  onNavigate?: (url: string, title: string) => void
  actions?: React.ReactNode
}) {
  const { navMode } = useNavMode()
  const breadcrumbs = getBreadcrumbs(activeUrl, breadcrumbLabels, defaultUrl)

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        {/* SidebarTrigger: hidden on mobile when navbar mode is active */}
        <SidebarTrigger
          className={cn(
            "-ml-1 transition-opacity",
            navMode === "navbar" && "max-md:pointer-events-none max-md:opacity-0 max-md:w-0 max-md:overflow-hidden max-md:mr-0 max-md:-ml-0"
          )}
        />
        <Separator
          orientation="vertical"
          className={cn(
            "mx-2 data-[orientation=vertical]:h-8 transition-opacity",
            navMode === "navbar" && "max-md:hidden"
          )}
        />
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 font-medium">
          {breadcrumbs.map((breadcrumb, index) => {
            const isLast = index === breadcrumbs.length - 1

            return (
              <div key={breadcrumb.url} className="flex items-center gap-1">
                {index > 0 ? (
                  <span className="text-muted-foreground/60">/</span>
                ) : null}
                {isLast ? (
                  <span
                    className={
                      index === 0
                        ? "font-medium text-foreground"
                        : "font-medium text-muted-foreground"
                    }
                  >
                    {breadcrumb.label}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="font-semibold text-foreground transition-colors hover:text-primary"
                    onClick={() => onNavigate?.(breadcrumb.url, breadcrumb.label)}
                  >
                    {breadcrumb.label}
                  </button>
                )}
              </div>
            )
          })}
        </nav>
        {/* Right side: actions + mobile nav toggle */}
        <div className="ml-auto flex items-center gap-2">
          <MobileNavToggle />
          {actions}
        </div>
      </div>
    </header>
  )
}
