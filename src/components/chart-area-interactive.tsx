import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import type { InteractiveAreaChartConfig } from "@/types/dashboard"

export const description = "A reusable interactive area chart"

const placeholderConfig = {
  title: "Sample Chart",
  description: "Sample range description",
  compactDescription: "Sample range",
  data: [
    { date: "2024-01-01", desktop: 10, mobile: 8 },
    { date: "2024-01-02", desktop: 14, mobile: 12 },
    { date: "2024-01-03", desktop: 11, mobile: 16 },
  ],
  chartConfig: {
    desktop: {
      label: "Desktop",
      color: "var(--primary)",
    },
    mobile: {
      label: "Mobile",
      color: "var(--primary)",
    },
  },
  ranges: [
    { value: "7d", label: "Last 7 days", days: 7 },
    { value: "30d", label: "Last 30 days", days: 30 },
  ],
  defaultRange: "30d",
  mobileRange: "7d",
  referenceDate: "2024-01-03",
} satisfies InteractiveAreaChartConfig

/**
 * Purpose: display a configurable responsive area chart with range controls.
 * Responsibilities: filter chart data by selected range and render chart UI.
 * Expected props: chart config from a page or feature.
 * Usage notes: includes generic placeholder values for development preview.
 */
export function ChartAreaInteractive({
  config = placeholderConfig,
}: {
  config?: InteractiveAreaChartConfig
}) {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState(config.defaultRange)

  React.useEffect(() => {
    setTimeRange(isMobile ? config.mobileRange : config.defaultRange)
  }, [config.defaultRange, config.mobileRange, isMobile])

  const selectedRange =
    config.ranges.find((range) => range.value === timeRange) ??
    config.ranges[0]

  const filteredData = config.data.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date(config.referenceDate)
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - selectedRange.days)
    return date >= startDate
  })

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{config.title}</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            {config.description}
          </span>
          <span className="@[540px]/card:hidden">
            {config.compactDescription}
          </span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={(value) => {
              if (value) {
                setTimeRange(value)
              }
            }}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            {config.ranges.map((range) => (
              <ToggleGroupItem key={range.value} value={range.value}>
                {range.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select chart range"
            >
              <SelectValue placeholder={selectedRange.label} />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {config.ranges.map((range) => (
                <SelectItem
                  key={range.value}
                  value={range.value}
                  className="rounded-lg"
                >
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={config.chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-desktop)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-desktop)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-mobile)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-mobile)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="mobile"
              type="natural"
              fill="url(#fillMobile)"
              stroke="var(--color-mobile)"
              stackId="a"
            />
            <Area
              dataKey="desktop"
              type="natural"
              fill="url(#fillDesktop)"
              stroke="var(--color-desktop)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
