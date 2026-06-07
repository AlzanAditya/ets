import * as React from "react"

import { NavPlanSection } from "@/components/nav-plan-section"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import type {
  BrandIdentity,
  NavigationItem,
  PlanNavigationSection,
  QuickActionItem,
  UserProfile,
} from "@/types/navigation"

const placeholderBrand = {
  title: "Sample App",
  href: "/dashboard",
  tagline: ["Sample Workspace", "Development Preview"],
} satisfies BrandIdentity

const placeholderUser = {
  name: "Preview User",
  email: "preview@example.test",
  fallback: "PU",
} satisfies UserProfile

/**
 * Purpose: render the application sidebar shell.
 * Responsibilities: compose brand, primary nav, plan sections, secondary nav, and user menu.
 * Expected props: navigation config supplied by a page, layout, or feature.
 * Usage notes: generic placeholders allow isolated rendering during development.
 */
export function AppSidebar({
  activeUrl,
  brand = placeholderBrand,
  mainItems = [],
  onNavigate,
  planSections = [],
  quickActions = [],
  secondaryItems = [],
  user = placeholderUser,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  activeUrl?: string
  brand?: BrandIdentity
  mainItems?: NavigationItem[]
  onNavigate?: (url: string, title: string) => void
  planSections?: PlanNavigationSection[]
  quickActions?: QuickActionItem[]
  secondaryItems?: NavigationItem[]
  user?: UserProfile
}) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="h-[45px] data-[slot=sidebar-menu-button]:p-1!"
            >
              <a
                href={brand.href}
                className="items-center"
                onClick={(event) => {
                  event.preventDefault()
                  onNavigate?.(brand.href, brand.title)
                }}
              >
                {brand.logoSrc ? (
                  <img
                    src={brand.logoSrc}
                    alt={brand.logoAlt ?? brand.title}
                    className="h-16 w-16 shrink-0 object-contain brightness-0 invert"
                  />
                ) : null}
                <span className="flex flex-col text-[0.6rem] font-medium uppercase leading-tight tracking-[0.05em] text-white/40">
                  {(brand.tagline ?? [brand.title]).map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          activeUrl={activeUrl}
          items={mainItems}
          quickActions={quickActions}
          onNavigate={onNavigate}
        />
        {planSections.map((section) => (
          <NavPlanSection
            key={section.label}
            activeUrl={activeUrl}
            items={section.items}
            label={section.label}
            onNavigate={onNavigate}
          />
        ))}
        <NavSecondary
          activeUrl={activeUrl}
          items={secondaryItems}
          onNavigate={onNavigate}
          className="mt-auto"
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
