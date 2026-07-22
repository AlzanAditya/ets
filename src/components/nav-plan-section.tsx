import { useState } from "react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"
import type { Plan, PlanNavigationItem } from "@/types/navigation"

const placeholderItems = [
  {
    name: "Sample Locked Item",
    url: "/sample",
    plan: "pro",
    icon: null,
  },
] satisfies PlanNavigationItem[]

function PlanBadge({ plan }: { plan?: Plan }) {
  if (!plan || plan === "free") {
    return null
  }

  return (
    <span className="ml-auto rounded-md border border-sidebar-border bg-white/5 px-1.5 py-1 text-[0.5rem] uppercase leading-none text-white/30">
      {plan}
    </span>
  )
}

const BADGE_STYLES: Record<NonNullable<PlanNavigationItem["badgeVariant"]>, string> = {
  default:     "bg-muted-foreground/20 text-muted-foreground",
  amber:       "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30",
  emerald:     "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30",
  destructive: "bg-red-500/20 text-red-400 ring-1 ring-red-500/30",
}

function MenuBadge({
  badge,
  variant = "default",
}: {
  badge?: string | number
  variant?: PlanNavigationItem["badgeVariant"]
}) {
  if (badge === undefined || badge === null || badge === "") return null
  return (
    <span
      className={`ml-auto min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[0.6rem] font-semibold leading-none tabular-nums ${
        BADGE_STYLES[variant ?? "default"]
      }`}
    >
      {badge}
    </span>
  )
}

/**
 * Purpose: render a grouped navigation section for plan-gated items.
 * Responsibilities: show item links, plan badges, and compact expand/collapse behavior.
 * Expected props: section label and items supplied by a feature or layout.
 * Usage notes: includes generic placeholder content for isolated development previews.
 */
export function NavPlanSection({
  items = placeholderItems,
  activeUrl,
  label = "Sample Section",
  onNavigate,
}: {
  items?: PlanNavigationItem[]
  activeUrl?: string
  label?: string
  onNavigate?: (url: string, title: string) => void
}) {
  const [showAll, setShowAll] = useState(false)
  const hasMoreItems = items.length > 3

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item, index) => {
          const isHiddenInExpanded = !showAll && hasMoreItems && index >= 3
          return (
            <SidebarMenuItem
              key={item.name}
              className={isHiddenInExpanded ? "hidden group-data-[collapsible=icon]:block" : ""}
            >
              <SidebarMenuButton
                asChild
                isActive={activeUrl === item.url}
                tooltip={item.name}
              >
                <a
                  href={item.url}
                  onClick={(event) => {
                    event.preventDefault()
                    onNavigate?.(item.url, item.name)
                  }}
                >
                  {item.icon}
                  <span className="flex-1 group-data-[collapsible=icon]:hidden">{item.name}</span>
                  <span className="group-data-[collapsible=icon]:hidden flex items-center gap-1">
                    <PlanBadge plan={item.plan} />
                    <MenuBadge badge={item.badge} variant={item.badgeVariant} />
                  </span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
        {hasMoreItems ? (
          <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
            <SidebarMenuButton
              className="text-sidebar-foreground/70 hover:bg-white/10 hover:text-white"
              onClick={() => setShowAll((value) => !value)}
            >
              {showAll ? (
                <ChevronUpIcon className="text-sidebar-foreground/70" />
              ) : (
                <ChevronDownIcon className="text-sidebar-foreground/70" />
              )}
              <span>{showAll ? "Less" : "More"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ) : null}
      </SidebarMenu>
    </SidebarGroup>
  )
}
