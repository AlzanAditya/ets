import * as React from "react"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useBreadcrumb } from "@/contexts/breadcrumb-context"
import { useNavMode } from "@/contexts/nav-mode-context"
import { cn } from "@/lib/utils"
import { appNavigation } from "@/config/navigation"
import { HeaderUser } from "@/components/header-user"

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
  const { subLabel } = useBreadcrumb()
  const { sidebarEnabled } = useNavMode()
  const breadcrumbs = getBreadcrumbs(activeUrl, breadcrumbLabels, defaultUrl)

  // If dynamic subLabel is set, replace the last breadcrumb segment
  if (subLabel && breadcrumbs.length > 1) {
    breadcrumbs[breadcrumbs.length - 1].label = subLabel
  }

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        {sidebarEnabled && (
          <>
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mx-2 data-[orientation=vertical]:h-8"
            />
          </>
        )}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 font-medium">
          {breadcrumbs.map((breadcrumb, index) => {
            const isLast = index === breadcrumbs.length - 1
            const isSub = index > 0

            return (
              <div key={breadcrumb.url} className="flex items-center gap-1">
                {index > 0 ? (
                  <span className="text-muted-foreground/30 font-light">/</span>
                ) : null}
                {isLast ? (
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        isSub
                          ? "font-semibold text-foreground/80 text-xs md:text-sm"
                          : "font-medium text-foreground text-sm md:text-base"
                      )}
                    >
                      {breadcrumb.label}
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="font-semibold text-foreground text-sm md:text-base transition-colors hover:text-primary"
                    onClick={() => onNavigate?.(breadcrumb.url, breadcrumb.label)}
                  >
                    {breadcrumb.label}
                  </button>
                )}
              </div>
            )
          })}
        </nav>
        {/* Right side: actions + profile icon */}
        <div className="ml-auto flex items-center gap-2">
          {actions}
          <HeaderUser user={appNavigation.user} />
        </div>
      </div>
    </header>
  )
}
