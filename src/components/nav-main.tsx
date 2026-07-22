import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { PlusIcon } from "lucide-react"
import type { NavigationItem, Plan, QuickActionItem } from "@/types/navigation"

const placeholderItems = [
  {
    title: "Sample Page",
    url: "/dashboard",
  },
] satisfies NavigationItem[]

function isMenuActive(activeUrl: string | undefined, itemUrl: string) {
  if (!activeUrl) {
    return false
  }

  return activeUrl === itemUrl || activeUrl.startsWith(`${itemUrl}/`)
}

function PlanBadge({ plan }: { plan?: Plan }) {
  if (!plan || plan === "free") {
    return null
  }

  return (
    <span className="ml-auto rounded-md border border-sidebar-border bg-white/5 px-1.5 py-0.5 text-[0.6rem] font-medium uppercase leading-none text-white/45">
      {plan}
    </span>
  )
}

const BADGE_STYLES: Record<NonNullable<NavigationItem["badgeVariant"]>, string> = {
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
  variant?: NavigationItem["badgeVariant"]
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
 * Purpose: render primary sidebar navigation and optional quick actions.
 * Responsibilities: handle active state, plan badges, and delegated navigation.
 * Expected props: nav items and actions supplied by a page or layout.
 * Usage notes: uses generic placeholder items when rendered without data.
 */
export function NavMain({
  items = placeholderItems,
  activeUrl,
  onNavigate,
  quickActions = [],
}: {
  items?: NavigationItem[]
  activeUrl?: string
  onNavigate?: (url: string, title: string) => void
  quickActions?: QuickActionItem[]
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        {quickActions.length ? (
          <SidebarMenu className="group-data-[collapsible=icon]:hidden">
            <SidebarMenuItem className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <SidebarMenuButton
                  asChild
                  key={action.url}
                  tooltip={action.title}
                  className={
                    action.variant === "primary"
                      ? "min-w-8 border border-primary/80 bg-transparent text-white duration-200 ease-linear hover:bg-primary hover:text-primary-foreground active:bg-transparent active:text-white"
                      : "min-w-8 border border-sidebar-border bg-white/5 text-white duration-200 ease-linear hover:bg-white/10 hover:text-white active:bg-white/10 active:text-white"
                  }
                >
                  <a
                    href={action.url}
                    onClick={(event) => {
                      event.preventDefault()
                      onNavigate?.(action.url, action.title)
                    }}
                  >
                    {action.icon ?? <PlusIcon className="size-4 shrink-0" />}
                    <span className="group-data-[collapsible=icon]:hidden">{action.label}</span>
                  </a>
                </SidebarMenuButton>
              ))}
            </SidebarMenuItem>
          </SidebarMenu>
        ) : null}
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={isMenuActive(activeUrl, item.url)}
                tooltip={item.title}
              >
                <a
                  href={item.url}
                  onClick={(event) => {
                    event.preventDefault()
                    onNavigate?.(item.url, item.title)
                  }}
                >
                  {item.icon}
                  <span className="flex-1 group-data-[collapsible=icon]:hidden">{item.title}</span>
                  <span className="group-data-[collapsible=icon]:hidden flex items-center gap-1">
                    <PlanBadge plan={item.plan} />
                    <MenuBadge badge={item.badge} variant={item.badgeVariant} />
                  </span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
