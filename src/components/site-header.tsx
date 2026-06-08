import * as React from "react"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

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
  const breadcrumbs = getBreadcrumbs(activeUrl, breadcrumbLabels, defaultUrl)

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
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
                        ? "font-semibold text-foreground"
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
        {actions ? (
          <div className="ml-auto flex items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  )
}
