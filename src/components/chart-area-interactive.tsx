import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { PackageIcon, UsersIcon } from "lucide-react"

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
import type { InteractiveAreaChartConfig } from "@/types/charts"
import type { TimeRangeOption } from "@/components/greeting-card"

export const description = "A reusable interactive area chart with category selection and dynamic time ranges"

/** Generates dynamic datasets based on time range and category */
function generateRangeData(range: TimeRangeOption, category: "produk" | "klien") {
  const isProduk = category === "produk"
  const now = new Date()

  if (range === "1d") {
    const hours = ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"]
    return hours.map((h, i) => ({
      date: h,
      desktop: isProduk ? 1210 + i * 4 + (i % 2 === 0 ? 5 : -3) : 124 + (i % 3),
      mobile: isProduk ? 12 + (i % 4) : 4 + (i % 2),
    }))
  }

  if (range === "1w") {
    const list = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split("T")[0]
      const step = 6 - i
      list.push({
        date: dateStr,
        desktop: isProduk ? 1190 + step * 8 + ((step * 7) % 15) : 120 + step + (step % 2),
        mobile: isProduk ? 10 + (step % 5) : 3 + (step % 3),
      })
    }
    return list
  }

  if (range === "1m") {
    const list = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split("T")[0]
      const step = 29 - i
      list.push({
        date: dateStr,
        desktop: isProduk ? 1150 + Math.round(step * 3.2) + ((step * 11) % 20) : 110 + Math.floor(step / 3) + (step % 2),
        mobile: isProduk ? 8 + (step % 7) : 2 + (step % 4),
      })
    }
    return list
  }

  if (range === "6m") {
    const list = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const dateStr = d.toISOString().split("T")[0]
      const step = 5 - i
      list.push({
        date: dateStr,
        desktop: isProduk ? 980 + step * 52 + (step % 2 === 0 ? 30 : -15) : 95 + step * 6 + (step % 2),
        mobile: isProduk ? 28 - step * 2 + (step % 3) : 12 - Math.floor(step / 2),
      })
    }
    return list
  }

  // 1y (12 Months)
  const list = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const dateStr = d.toISOString().split("T")[0]
    const step = 11 - i
    list.push({
      date: dateStr,
      desktop: isProduk ? 820 + step * 38 + ((step * 17) % 40) : 80 + step * 4 + (step % 3),
      mobile: isProduk ? 35 - Math.floor(step * 1.5) + (step % 4) : 15 - Math.floor(step / 2),
    })
  }
  return list
}

interface ChartAreaInteractiveProps {
  config?: InteractiveAreaChartConfig
  selectedRange?: TimeRangeOption
}

export function ChartAreaInteractive({
  selectedRange = "1m",
}: ChartAreaInteractiveProps) {
  const [category, setCategory] = React.useState<"produk" | "klien">("produk")

  // Generate dynamic data according to selected time range & category
  const chartData = React.useMemo(() => {
    return generateRangeData(selectedRange, category)
  }, [selectedRange, category])

  const categoryConfigs = {
    produk: {
      title: "Tren Aktivitas Produk",
      description:
        selectedRange === "1d"
          ? "Tren aktivitas scan dan kondisi produk hari ini"
          : selectedRange === "1w"
          ? "Tren aktivitas scan dan kondisi produk 1 minggu terakhir"
          : selectedRange === "1m"
          ? "Tren aktivitas scan dan kondisi produk 1 bulan terakhir"
          : selectedRange === "6m"
          ? "Tren aktivitas scan dan kondisi produk 6 bulan terakhir"
          : "Tren aktivitas scan dan kondisi produk 1 tahun terakhir",
      chartConfig: {
        desktop: {
          label: "Produk Aman",
          color: "#10b981",
        },
        mobile: {
          label: "Produk Bermasalah",
          color: "#ef4444",
        },
      },
    },
    klien: {
      title: "Tren Aktivitas Klien",
      description:
        selectedRange === "1d"
          ? "Tren performa layanan dan status perbaikan klien hari ini"
          : selectedRange === "1w"
          ? "Tren performa layanan dan status perbaikan klien 1 minggu terakhir"
          : selectedRange === "1m"
          ? "Tren performa layanan dan status perbaikan klien 1 bulan terakhir"
          : selectedRange === "6m"
          ? "Tren performa layanan dan status perbaikan klien 6 bulan terakhir"
          : "Tren performa layanan dan status perbaikan klien 1 tahun terakhir",
      chartConfig: {
        desktop: {
          label: "Klien Aman",
          color: "#10b981",
        },
        mobile: {
          label: "Dalam Perbaikan",
          color: "#f59e0b",
        },
      },
    },
  }

  const currentCategory = categoryConfigs[category]

  // Formatters for X-Axis and Tooltip
  const formatXAxis = (value: string) => {
    if (selectedRange === "1d") return value
    const date = new Date(value)
    if (selectedRange === "6m" || selectedRange === "1y") {
      return date.toLocaleDateString("id-ID", { month: "short" })
    }
    return date.toLocaleDateString("id-ID", { month: "short", day: "numeric" })
  }

  const formatTooltipLabel = (value: string) => {
    if (selectedRange === "1d") return `Hari Ini, ${value}`
    const date = new Date(value)
    if (selectedRange === "6m" || selectedRange === "1y") {
      return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
    }
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  return (
    <Card className="@container/card">
      <CardHeader className="flex flex-col @[540px]/card:flex-row items-start @[540px]/card:items-center justify-between gap-2 pb-2 sm:pb-4">
        <div>
          <CardTitle className="text-base sm:text-lg font-bold">
            {currentCategory.title}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm mt-0.5">
            {currentCategory.description}
          </CardDescription>
        </div>
        <CardAction className="self-end @[540px]/card:self-auto shrink-0 mt-1 @[540px]/card:mt-0">
          <ToggleGroup
            type="single"
            value={category}
            onValueChange={(value) => {
              if (value) {
                setCategory(value as "produk" | "klien")
              }
            }}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-3.5! @[540px]/card:flex border-border/80 rounded-xl"
          >
            <ToggleGroupItem value="produk" className="gap-1.5 text-xs font-semibold">
              <PackageIcon className="size-3.5 text-emerald-500" />
              <span>Produk</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="klien" className="gap-1.5 text-xs font-semibold">
              <UsersIcon className="size-3.5 text-emerald-500" />
              <span>Klien</span>
            </ToggleGroupItem>
          </ToggleGroup>

          <Select value={category} onValueChange={(val) => setCategory(val as "produk" | "klien")}>
            <SelectTrigger
              className="flex w-auto @[540px]/card:hidden h-8 text-xs font-semibold rounded-xl"
              size="sm"
              aria-label="Pilih Kategori"
            >
              <SelectValue placeholder="Pilih Kategori" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="produk" className="text-xs font-medium">
                Produk
              </SelectItem>
              <SelectItem value="klien" className="text-xs font-medium">
                Klien
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-2 sm:px-6 sm:pt-4">
        <ChartContainer
          config={currentCategory.chartConfig}
          className="aspect-auto h-[240px] sm:h-[280px] w-full"
        >
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-desktop)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-desktop)"
                  stopOpacity={0.05}
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
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={20}
              tickFormatter={formatXAxis}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={formatTooltipLabel}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="mobile"
              type="natural"
              fill="url(#fillMobile)"
              stroke="var(--color-mobile)"
              strokeWidth={2}
              stackId="a"
            />
            <Area
              dataKey="desktop"
              type="natural"
              fill="url(#fillDesktop)"
              stroke="var(--color-desktop)"
              strokeWidth={2}
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
