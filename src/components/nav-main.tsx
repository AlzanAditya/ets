import type { ReactNode } from "react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { PlusIcon } from "lucide-react"

type Plan = "free" | "pro" | "max"

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

export function NavMain({
  items,
  activeUrl,
  onNavigate,
}: {
  items: {
    title: string
    url: string
    plan?: Plan
    icon?: ReactNode
  }[]
  activeUrl?: string
  onNavigate?: (url: string, title: string) => void
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="grid grid-cols-2 gap-2 group-data-[collapsible=icon]:grid-cols-1">
            <SidebarMenuButton
              asChild
              tooltip="Add Product"
              className="min-w-8 border border-primary/80 bg-transparent text-white duration-200 ease-linear hover:bg-primary hover:text-primary-foreground active:bg-transparent active:text-white"
            >
              <a
                href="/products/add"
                onClick={(event) => {
                  event.preventDefault()
                  onNavigate?.("/products/add", "Add Product")
                }}
              >
                <PlusIcon />
                <span>Product</span>
              </a>
            </SidebarMenuButton>
            <SidebarMenuButton
              asChild
              tooltip="Add Transaction"
              className="min-w-8 border border-sidebar-border bg-white/5 text-white duration-200 ease-linear hover:bg-white/10 hover:text-white active:bg-white/10 active:text-white"
            >
              <a
                href="/transaction/add"
                onClick={(event) => {
                  event.preventDefault()
                  onNavigate?.("/transaction/add", "Add Transaction")
                }}
              >
                <PlusIcon />
                <span>Transaction</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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
                  <span>{item.title}</span>
                  <PlanBadge plan={item.plan} />
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
