import type { LucideIcon } from "lucide-react"

export interface DonutStatusItem {
  label: string
  value: number
  formattedValue?: string
  color: string // e.g. "bg-emerald-500" or "bg-red-500"
}

export interface DonutMetricCardItem {
  type: "donut"
  id: string
  centerIcon: LucideIcon
  items: [DonutStatusItem, DonutStatusItem] // [Aman/Normal, Bermasalah/Service]
  totalLabel?: string
}

export interface StandardMetricCardItem {
  type?: "standard"
  label: string
  value: string
  delta: string
  trend: "up" | "down" | "neutral"
  summary?: string
  description?: string
  icon?: LucideIcon
  status?: "success" | "danger" | "warning" | "info" | "default"
  colorScheme?: "emerald" | "blue" | "purple" | "amber" | "teal" | "rose" | "indigo" | "cyan"
  comparisonPeriod?: string
}

export type MetricCardItem = StandardMetricCardItem | DonutMetricCardItem
