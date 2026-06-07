import type { LucideIcon } from "lucide-react"

export interface MetricCardItem {
  label: string
  value: string
  delta: string
  trend: "up" | "down"
  summary: string
  description: string
  icon?: LucideIcon
}
