import type { ChartConfig } from "@/components/ui/chart"

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
