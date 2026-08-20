import {
  CalendarCheck2Icon,
  FileChartColumnIcon,
  HardHatIcon,
  ImageIcon,
  LandmarkIcon,
  LayoutGridIcon,
  PackageIcon,
  PrinterIcon,
  ReceiptIcon,
  ScanQrCodeIcon,
  SettingsIcon,
  SparklesIcon,
  UsersIcon,
  Wallet2Icon,
} from "lucide-react"
import type { AppNavigationConfig, Plan } from "@/types/navigation"
import { CLIENT_IDENTITY } from "@/config/client-identity"

const plan = {
  free: "free",
  pro: "pro",
  max: "max",
} satisfies Record<Plan, Plan>

export const appNavigation = {
  brand: {
    title: "Dashboard",
    href: "/dashboard",
    logoSrc: CLIENT_IDENTITY.logo.src,
    logoAlt: CLIENT_IDENTITY.logo.alt || CLIENT_IDENTITY.shortName,
    tagline: CLIENT_IDENTITY.tagline,
  },
  user: {
    name: `Admin ${CLIENT_IDENTITY.shortName}`,
    email: "admin@ets.co.id",
    avatar: "/avatars/shadcn.jpg",
    fallback: CLIENT_IDENTITY.shortName.slice(0, 2).toUpperCase(),
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
      title: "Events",
      url: "/events",
      plan: plan.free,
      icon: <CalendarCheck2Icon />,
    },
    {
      title: "Stickers",
      url: "/stickers",
      plan: plan.free,
      icon: <PrinterIcon />,
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
    stickers: "Stickers",
    "qr-statistics": "QR Statistics",
    transaction: "Transaction",
    images: "Images",
    invoice: "Invoice",
    clients: "Clients",
    client: "Clients",
    reports: "Reports",
    "ai-agent": "AI Agent",    tax: "Tax",
    workers: "Workers",
    branches: "Workers",
    settings: "Settings",
  },
} satisfies AppNavigationConfig
