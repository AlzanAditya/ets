import { useState, type ReactNode } from "react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"

type Plan = "free" | "pro" | "max"

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

export function NavPlanSection({
  items,
  activeUrl,
  label,
  onNavigate,
}: {
  items: {
    name: string
    url: string
    plan?: Plan
    icon: ReactNode
  }[]
  activeUrl?: string
  label: string
  onNavigate?: (url: string, title: string) => void
}) {
  const [showAll, setShowAll] = useState(false)
  const hasMoreItems = items.length > 3
  const visibleItems = showAll || !hasMoreItems ? items : items.slice(0, 3)

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {visibleItems.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild isActive={activeUrl === item.url}>
              <a
                href={item.url}
                onClick={(event) => {
                  event.preventDefault()
                  onNavigate?.(item.url, item.name)
                }}
              >
                {item.icon}
                <span>{item.name}</span>
                <PlanBadge plan={item.plan} />
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
        {hasMoreItems ? (
          <SidebarMenuItem>
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
