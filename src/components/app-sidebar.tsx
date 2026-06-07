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
import { CameraIcon, FileTextIcon, FileChartColumnIcon, ScanQrCodeIcon, PackageIcon, Wallet2Icon, ImageIcon, SettingsIcon, ReceiptIcon, SparklesIcon, LayoutGridIcon, UsersIcon, LandmarkIcon, Building2Icon } from "lucide-react"

type Plan = "free" | "pro" | "max"

const plan = {
  free: "free",
  pro: "pro",
  max: "max",
} satisfies Record<Plan, Plan>

const data = {
  user: {
    name: "Berkah Maju Elektrik",
    email: "admin@bme.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      plan: plan.free,
      icon: (
        <LayoutGridIcon
        />
      ),
    },
    {
      title: "Products",
      url: "/products",
      plan: plan.free,
      icon: (
        <PackageIcon
        />
      ),
    },
    {
      title: "QR Statistics",
      url: "/qr-statistics",
      plan: plan.free,
      icon: (
        <ScanQrCodeIcon
        />
      ),
    },
    {
      title: "Transaction",
      url: "/transaction",
      plan: plan.free,
      icon: (
        <Wallet2Icon
        />
      ),
    },
    {
      title: "Images",
      url: "/images",
      plan: plan.free,
      icon: (
        <ImageIcon
        />
      ),
    },
  ],
  navClouds: [
    {
      title: "Capture",
      icon: (
        <CameraIcon
        />
      ),
      isActive: true,
      url: "/capture",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Proposal",
      icon: (
        <FileTextIcon
        />
      ),
      url: "/proposal",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Prompts",
      icon: (
        <FileTextIcon
        />
      ),
      url: "/prompts",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: (
        <SettingsIcon
        />
      ),
    },
  ],
  commingSoon: [
    {
      name: "Invoice",
      url: "/invoice",
      plan: plan.pro,
      icon: (
        <ReceiptIcon
        />
      ),
    },
    {
      name: "Reports",
      url: "/reports",
      plan: plan.pro,
      icon: (
        <FileChartColumnIcon
        />
      ),
    },
    {
      name: "Clients",
      url: "/client",
      plan: plan.pro,
      icon: (
        <UsersIcon
        />
      ),
    },
  ],
  locked: [
    {
      name: "AI Agent",
      url: "/ai-agent",
      plan: plan.max,
      icon: (
        <SparklesIcon
        />
      ),
    },
    {
      name: "Tax",
      url: "/tax",
      plan: plan.pro,
      icon: (
        <LandmarkIcon
        />
      ),
    },
    {
      name: "Branches",
      url: "/branches",
      plan: plan.max,
      icon: (
        <Building2Icon
        />
      ),
    },
  ],
}

export function AppSidebar({
  activeUrl,
  onNavigate,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  activeUrl?: string
  onNavigate?: (url: string, title: string) => void
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
                href="/dashboard"
                className="items-center"
                onClick={(event) => {
                  event.preventDefault()
                  onNavigate?.("/dashboard", "Dashboard")
                }}
              >
                <img
                  src="/ets-logo.png"
                  alt="ETS"
                  className="h-16 w-16 shrink-0 object-contain brightness-0 invert"
                />
                <span className="flex flex-col text-[0.6rem] font-medium uppercase leading-tight tracking-[0.05em] text-white/40">
                  <span>Protecting &amp; Improving</span>
                  <span>Electricity</span>
                </span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          activeUrl={activeUrl}
          items={data.navMain}
          onNavigate={onNavigate}
        />
        <NavPlanSection
          activeUrl={activeUrl}
          items={data.commingSoon}
          label="Coming soon (jika berlangganan)"
          onNavigate={onNavigate}
        />
        <NavPlanSection
          activeUrl={activeUrl}
          items={data.locked}
          label="Tingkatkan plan anda"
          onNavigate={onNavigate}
        />
        <NavSecondary
          activeUrl={activeUrl}
          items={data.navSecondary}
          onNavigate={onNavigate}
          className="mt-auto"
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
