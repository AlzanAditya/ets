import * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { DashboardDataTable } from "@/features/dashboard/components/dashboard-data-table"
import { dashboardAreaChart } from "@/features/dashboard/config/chart"
import { dashboardMetrics } from "@/features/dashboard/config/metrics"
import { dashboardNavigation } from "@/features/dashboard/config/navigation"
import type { DashboardTableRow } from "@/types/dashboard"

import data from "./data.json"

function getActiveUrl(pathname: string) {
  return pathname === "/" ? "/dashboard" : pathname
}

export default function DashboardPage() {
  const [activeUrl, setActiveUrl] = React.useState(() =>
    getActiveUrl(window.location.pathname)
  )

  React.useEffect(() => {
    const handlePopState = () => {
      setActiveUrl(getActiveUrl(window.location.pathname))
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  function handleNavigate(url: string, _title: string) {
    if (window.location.pathname !== url) {
      window.history.pushState(null, "", url)
    }

    setActiveUrl(url)
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        activeUrl={activeUrl}
        brand={dashboardNavigation.brand}
        mainItems={dashboardNavigation.mainItems}
        onNavigate={handleNavigate}
        planSections={dashboardNavigation.planSections}
        quickActions={dashboardNavigation.quickActions}
        secondaryItems={dashboardNavigation.secondaryItems}
        user={dashboardNavigation.user}
        variant="inset"
      />
      <SidebarInset>
        <SiteHeader
          activeUrl={activeUrl}
          breadcrumbLabels={dashboardNavigation.breadcrumbLabels}
          onNavigate={handleNavigate}
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards items={dashboardMetrics} />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive config={dashboardAreaChart} />
              </div>
              <DashboardDataTable data={data satisfies DashboardTableRow[]} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
