import { TrendingDownIcon, TrendingUpIcon } from "lucide-react"

import type { MetricCardItem } from "@/types/dashboard"

export const dashboardMetrics = [
  {
    label: "Total Revenue",
    value: "$6,250.00",
    delta: "+12.5%",
    trend: "up",
    summary: "Trending up this month",
    description: "Visitors for the last 6 months",
    icon: TrendingUpIcon,
  },
  {
    label: "New Customers",
    value: "1,234",
    delta: "-20%",
    trend: "down",
    summary: "Down 20% this period",
    description: "Acquisition needs attention",
    icon: TrendingDownIcon,
  },
  {
    label: "Active Accounts",
    value: "45,678",
    delta: "+12.5%",
    trend: "up",
    summary: "Strong user retention",
    description: "Engagement exceed targets",
    icon: TrendingUpIcon,
  },
  {
    label: "Growth Rate",
    value: "4.5%",
    delta: "+4.5%",
    trend: "up",
    summary: "Steady performance increase",
    description: "Meets growth projections",
    icon: TrendingUpIcon,
  },
] satisfies MetricCardItem[]
