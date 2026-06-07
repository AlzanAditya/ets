import {
  Building2Icon,
  FileChartColumnIcon,
  ImageIcon,
  LandmarkIcon,
  LayoutGridIcon,
  PackageIcon,
  PlusIcon,
  ReceiptIcon,
  ScanQrCodeIcon,
  SettingsIcon,
  SparklesIcon,
  UsersIcon,
  Wallet2Icon,
} from "lucide-react"

import type { AppNavigationConfig, Plan } from "@/types/navigation"

const plan = {
  free: "free",
  pro: "pro",
  max: "max",
} satisfies Record<Plan, Plan>

export const dashboardNavigation = {
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
      title: "QR Statistics",
      url: "/qr-statistics",
      plan: plan.free,
      icon: <ScanQrCodeIcon />,
    },
    {
      title: "Transaction",
      url: "/transaction",
      plan: plan.free,
      icon: <Wallet2Icon />,
    },
    {
      title: "Images",
      url: "/images",
      plan: plan.free,
      icon: <ImageIcon />,
    },
  ],
  quickActions: [
    {
      title: "Add Product",
      url: "/products/add",
      label: "Product",
      icon: <PlusIcon />,
      variant: "primary",
    },
    {
      title: "Add Transaction",
      url: "/transaction/add",
      label: "Transaction",
      icon: <PlusIcon />,
      variant: "secondary",
    },
  ],
  planSections: [
    {
      label: "Coming soon (jika berlangganan)",
      items: [
        {
          name: "Invoice",
          url: "/invoice",
          plan: plan.pro,
          icon: <ReceiptIcon />,
        },
        {
          name: "Reports",
          url: "/reports",
          plan: plan.pro,
          icon: <FileChartColumnIcon />,
        },
        {
          name: "Clients",
          url: "/client",
          plan: plan.pro,
          icon: <UsersIcon />,
        },
      ],
    },
    {
      label: "Tingkatkan plan anda",
      items: [
        {
          name: "AI Agent",
          url: "/ai-agent",
          plan: plan.max,
          icon: <SparklesIcon />,
        },
        {
          name: "Tax",
          url: "/tax",
          plan: plan.pro,
          icon: <LandmarkIcon />,
        },
        {
          name: "Branches",
          url: "/branches",
          plan: plan.max,
          icon: <Building2Icon />,
        },
      ],
    },
  ],
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
    "qr-statistics": "Qr Statistics",
    "qr-analytics": "Qr Analytics",
    images: "Images",
    invoice: "Invoice",
    reports: "Reports",
    client: "Clients",
    "ai-agent": "AI Agent",
    tax: "Tax",
    branches: "Branches",
    settings: "Settings",
    add: "Add",
  },
} satisfies AppNavigationConfig
