import {
  FileChartColumnIcon,
  HardHatIcon,
  ImageIcon,
  LandmarkIcon,
  LayoutGridIcon,
  PackageIcon,
  QrCodeIcon,
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

export const appNavigation = {
  brand: {
    title: "Dashboard",
    href: "/dashboard",
    logoSrc: "/ets-logo.png",
    logoAlt: "ETS",
    tagline: ["Protecting & Improving", "Electricity"],
  },
  user: {
    name: "Admin ETS",
    email: "admin@ets.co.id",
    avatar: "/avatars/shadcn.jpg",
    fallback: "AE",
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
      title: "Clients",
      url: "/clients",
      plan: plan.free,
      icon: <UsersIcon />,
    },
    {
      title: "Workers",
      url: "/workers",
      plan: plan.free,
      icon: <HardHatIcon />,
    },
    {
      title: "Reports",
      url: "/reports",
      plan: plan.free,
      icon: <FileChartColumnIcon />,
    },
    {
      title: "Stickers",
      url: "/stickers",
      plan: plan.free,
      icon: <QrCodeIcon />,
    },
  ],
  quickActions: [
    {
      title: "Add Product",
      url: "/products/add",
      label: "Product",
      variant: "primary",
    },
    {
      title: "Add Client",
      url: "/clients/add",
      label: "Client",
      variant: "secondary",
    },
  ],
  planSections: [
    {
      label: "Coming Soon",
      items: [
        {
          name: "Transaction",
          url: "/transaction",
          plan: plan.pro,
          icon: <Wallet2Icon />,
        },
        {
          name: "Invoice",
          url: "/invoice",
          plan: plan.pro,
          icon: <ReceiptIcon />,
        },
        {
          name: "QR Statistics",
          url: "/qr-statistics",
          plan: plan.pro,
          icon: <ScanQrCodeIcon />,
        },
        {
          name: "Images",
          url: "/images",
          plan: plan.pro,
          icon: <ImageIcon />,
        },
      ],
    },
    {
      label: "Locked",
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
    "qr-statistics": "QR Statistics",
    transaction: "Transaction",
    images: "Images",
    invoice: "Invoice",
    clients: "Clients",
    client: "Clients",
    reports: "Reports",
    stickers: "Stickers",
    "ai-agent": "AI Agent",
    tax: "Tax",
    workers: "Workers",
    branches: "Workers",
    settings: "Settings",
  },
} satisfies AppNavigationConfig
