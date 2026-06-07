import type { ChartConfig } from "@/components/ui/chart"
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

export interface AreaChartDatum {
  date: string
  desktop: number
  mobile: number
}

export interface ChartRangeOption {
  value: string
  label: string
  days: number
}

export interface InteractiveAreaChartConfig {
  title: string
  description: string
  compactDescription: string
  data: AreaChartDatum[]
  chartConfig: ChartConfig
  ranges: ChartRangeOption[]
  defaultRange: string
  mobileRange: string
  referenceDate: string
}

export interface DashboardTableRow {
  id: number
  header: string
  type: string
  status: string
  target: string
  limit: string
  reviewer: string
}
