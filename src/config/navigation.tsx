import {
  FileChartColumnIcon,
  LayoutGridIcon,
  PackageIcon,
  ReceiptIcon,
  SettingsIcon,
  UsersIcon,
  Wallet2Icon,
} from "lucide-react"

import type { AppNavigationConfig, Plan } from "@/types/navigation"

const plan = {
  free: "free",
  pro: "pro",
  max: "max",
} satisfies Record<Plan, Plan>

export const appNavigation = {
  brand: {
    title: "Dashboard",
    href: "/dashboard",
    logoSrc: "/ets-logo.png",
    logoAlt: "ETS",
    tagline: ["Protecting & Improving", "Electricity"],
  },
  user: {
    name: "Berkah Maju Elektrik",
    email: "admin@bme.com",
    avatar: "/avatars/shadcn.jpg",
    fallback: "BM",
  },
  mainItems: [
    {
      title: "Dashboard",
      url: "/dashboard",
      plan: plan.free,
      icon: <LayoutGridIcon />,
    },
    {
      title: "Products",
      url: "/products",
      plan: plan.free,
      icon: <PackageIcon />,
    },
    {
      title: "Transaction",
      url: "/transaction",
      plan: plan.free,
      icon: <Wallet2Icon />,
    },
    {
      title: "Invoice",
      url: "/invoice",
      plan: plan.pro,
      icon: <ReceiptIcon />,
    },
    {
      title: "Client",
      url: "/client",
      plan: plan.pro,
      icon: <UsersIcon />,
    },
    {
      title: "Reports",
      url: "/reports",
      plan: plan.pro,
      icon: <FileChartColumnIcon />,
    },
  ],
  quickActions: [],
  planSections: [],
  secondaryItems: [
    {
      title: "Settings",
      url: "/settings",
      icon: <SettingsIcon />,
    },
  ],
  breadcrumbLabels: {
    dashboard: "Dashboard",
    products: "Products",
    transaction: "Transaction",
    invoice: "Invoice",
    client: "Client",
    reports: "Reports",
    settings: "Settings",
  },
} satisfies AppNavigationConfig
