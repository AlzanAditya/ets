import { motion } from "framer-motion"
import {
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  AlertOctagonIcon,
  ThumbsUpIcon,
} from "lucide-react"
import type { MetricCardItem } from "@/types/metrics"
import { Card } from "@/components/ui/card"

const DEFAULT_COLOR_PALETTE = [
  { bg: "bg-emerald-500/15 dark:bg-emerald-500/25", icon: "text-emerald-600 dark:text-emerald-400" },
  { bg: "bg-blue-500/15 dark:bg-blue-500/25", icon: "text-blue-600 dark:text-blue-400" },
  { bg: "bg-purple-500/15 dark:bg-purple-500/25", icon: "text-purple-600 dark:text-purple-400" },
  { bg: "bg-amber-500/15 dark:bg-amber-500/25", icon: "text-amber-600 dark:text-amber-400" },
  { bg: "bg-teal-500/15 dark:bg-teal-500/25", icon: "text-teal-600 dark:text-teal-400" },
  { bg: "bg-emerald-500/15 dark:bg-emerald-500/25", icon: "text-emerald-600 dark:text-emerald-400" },
]

const COLOR_MAP: Record<string, { bg: string; icon: string }> = {
  emerald: { bg: "bg-emerald-500/15 dark:bg-emerald-500/25", icon: "text-emerald-600 dark:text-emerald-400" },
  blue: { bg: "bg-blue-500/15 dark:bg-blue-500/25", icon: "text-blue-600 dark:text-blue-400" },
  purple: { bg: "bg-purple-500/15 dark:bg-purple-500/25", icon: "text-purple-600 dark:text-purple-400" },
  amber: { bg: "bg-amber-500/15 dark:bg-amber-500/25", icon: "text-amber-600 dark:text-amber-400" },
  teal: { bg: "bg-teal-500/15 dark:bg-teal-500/25", icon: "text-teal-600 dark:text-teal-400" },
  rose: { bg: "bg-rose-500/15 dark:bg-rose-500/25", icon: "text-rose-600 dark:text-rose-400" },
  indigo: { bg: "bg-indigo-500/15 dark:bg-indigo-500/25", icon: "text-indigo-600 dark:text-indigo-400" },
  cyan: { bg: "bg-cyan-500/15 dark:bg-cyan-500/25", icon: "text-cyan-600 dark:text-cyan-400" },
}

interface MetricCardsProps {
  items?: MetricCardItem[]
  className?: string
  timeRangeText?: string
}

function DonutChartSVG({
  v1,
  v2,
  Icon,
}: {
  v1: number
  v2: number
  Icon: React.ElementType
}) {
  const total = Math.max(v1 + v2, 1)
  const r = 36
  const circ = 2 * Math.PI * r // ~226.19
  const len1 = (v1 / total) * circ
  const len2 = (v2 / total) * circ

  return (
    <div className="relative size-24 sm:size-28 md:size-32 shrink-0 flex items-center justify-center">
      <svg viewBox="0 0 90 90" className="size-full -rotate-90 overflow-visible">
        {/* Background ring track */}
        <circle
          cx="45"
          cy="45"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="11"
          className="text-muted/20"
        />
        {/* Slice 1 (Aman / Normal - Emerald color with sharp 'butt' ends) */}
        {v1 > 0 && (
          <motion.circle
            cx="45"
            cy="45"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="11"
            strokeDasharray={`${len1} ${circ - len1}`}
            strokeLinecap="butt"
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-emerald-500 dark:text-emerald-400"
          />
        )}
        {/* Slice 2 (Service / Bermasalah - Red color with sharp 'butt' ends) */}
        {v2 > 0 && (
          <motion.circle
            cx="45"
            cy="45"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="11"
            strokeDasharray={`${len2} ${circ - len2}`}
            strokeLinecap="butt"
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: -len1 }}
            transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
            className="text-red-500 dark:text-red-400"
          />
        )}
      </svg>
      {/* Icon centered inside the donut hole */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <Icon className="size-7 sm:size-9 text-foreground/85 shrink-0" />
      </motion.div>
    </div>
  )
}

export function MetricCards({
  items = [],
  className = "px-4 lg:px-6",
  timeRangeText = "dari kemarin",
}: MetricCardsProps) {
  if (!items || items.length === 0) return null

  const isAllDonut = items.every((item) => "type" in item && item.type === "donut")

  return (
    <div
      className={
        isAllDonut
          ? `grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full ${className}`
          : `grid grid-cols-3 gap-2 sm:gap-4 w-full ${className}`
      }
    >
      {items.map((item, index) => {
        // Render Donut Metric Card
        if ("type" in item && item.type === "donut") {
          const totalVal = item.items[0].value + item.items[1].value
          const p1 = Math.round((item.items[0].value / Math.max(totalVal, 1)) * 100)
          const p2 = Math.round((item.items[1].value / Math.max(totalVal, 1)) * 100)

          // Determine Status based on p2 (% bermasalah)
          // > 60% = Danger (Red gradient, bold danger icon)
          // > 30% = Alert (Yellow gradient, bold alert icon)
          // < 10% = Safe (Blue gradient, bold thumbs up icon)
          const isDanger = p2 > 60
          const isAlert = !isDanger && p2 > 30
          const isSafe = p2 < 10

          let cardStyle = "border-blue-500/40 bg-gradient-to-l from-blue-500/20 via-blue-500/10 to-card dark:from-blue-950/70 dark:via-blue-900/30 dark:to-card"
          if (isDanger) {
            cardStyle = "border-red-500/50 bg-gradient-to-l from-red-500/30 via-red-500/15 to-card dark:from-red-950/85 dark:via-red-900/40 dark:to-card"
          } else if (isAlert) {
            cardStyle = "border-amber-500/50 bg-gradient-to-l from-amber-500/30 via-amber-500/15 to-card dark:from-amber-950/85 dark:via-amber-900/40 dark:to-card"
          } else if (isSafe) {
            cardStyle = "border-blue-500/50 bg-gradient-to-l from-blue-500/30 via-blue-500/15 to-card dark:from-blue-950/85 dark:via-blue-900/40 dark:to-card"
          }

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: index * 0.1, ease: "easeOut" }}
              className={isAllDonut ? "col-span-1" : "col-span-2"}
            >
              <Card className={`relative rounded-xl sm:rounded-2xl border p-4 sm:p-5 md:p-6 shadow-xs transition-all hover:shadow-sm flex flex-row items-center justify-start gap-4 sm:gap-6 min-w-0 h-full overflow-hidden ${cardStyle}`}>
                {/* Top-Right Status Icon (No outline, bold feel) */}
                <div className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-20 pointer-events-none">
                  {isDanger && (
                    <AlertOctagonIcon className="size-5 sm:size-6 text-red-500 fill-red-500 stroke-none drop-shadow-xs" />
                  )}
                  {isAlert && (
                    <AlertTriangleIcon className="size-5 sm:size-6 text-amber-500 fill-amber-500 stroke-none drop-shadow-xs" />
                  )}
                  {(isSafe || (!isDanger && !isAlert)) && (
                    <ThumbsUpIcon className="size-5 sm:size-6 text-blue-500 fill-blue-500 stroke-none drop-shadow-xs" />
                  )}
                </div>

                {/* Left Side: Donut Chart SVG (Larger) */}
                <div className="shrink-0 z-10">
                  <DonutChartSVG
                    v1={item.items[0].value}
                    v2={item.items[1].value}
                    Icon={item.centerIcon}
                  />
                </div>

                {/* Right Side: Text Legend & Counts in a Single Line per item */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-2.5 sm:gap-3 z-10 pb-6 sm:pb-5">
                  {/* Item 1: Aman / Normal */}
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <span className="size-3 rounded-none bg-emerald-500 dark:bg-emerald-400 shrink-0" />
                    <span className="text-xs sm:text-sm font-medium text-muted-foreground/90 truncate">
                      {item.items[0].label}
                    </span>
                    <span className="text-base sm:text-xl font-bold tracking-tight text-foreground tabular-nums ml-1 shrink-0">
                      {item.items[0].formattedValue ?? item.items[0].value.toLocaleString("id-ID")}
                    </span>
                  </div>

                  {/* Item 2: Bermasalah / Service */}
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <span className="size-3 rounded-none bg-red-500 dark:bg-red-400 shrink-0" />
                    <span className="text-xs sm:text-sm font-medium text-muted-foreground/90 truncate">
                      {item.items[1].label}
                    </span>
                    <span className="text-base sm:text-xl font-bold tracking-tight text-foreground tabular-nums ml-1 shrink-0">
                      {item.items[1].formattedValue ?? item.items[1].value.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                {/* Absolute Positioned Percentages at Bottom Right: 33% | 67% */}
                <div className="absolute bottom-2.5 right-3.5 sm:bottom-3 sm:right-4 flex items-center text-xs sm:text-sm font-bold tabular-nums pointer-events-none z-20">
                  <span className="text-emerald-500 dark:text-emerald-400">{p1}%</span>
                  <span className="text-muted-foreground/40 font-normal mx-1.5">|</span>
                  <span className="text-red-500 dark:text-red-400">{p2}%</span>
                </div>
              </Card>
            </motion.div>
          )
        }

        // Standard 1x1 Metric Card
        const IconComponent = item.icon || TrendingUpIcon
        
        // Determine color styling
        const scheme =
          (item.colorScheme && COLOR_MAP[item.colorScheme]) ||
          DEFAULT_COLOR_PALETTE[index % DEFAULT_COLOR_PALETTE.length]

        const periodLabel = item.comparisonPeriod || timeRangeText

        // Clean delta string
        const deltaClean = item.delta ? item.delta.replace(/^([+↑↓-])\s*/, "") : "0%"
        const isZero = deltaClean === "0%" || deltaClean === "0" || item.delta === "-" || item.delta === "0%" || item.delta === "+0%"
        const isUp = item.trend === "up" && !isZero
        const isDown = item.trend === "down" && !isZero

        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.08, ease: "easeOut" }}
            className="col-span-1"
          >
            <Card
              className="rounded-xl sm:rounded-2xl border border-border/80 bg-card/90 p-3 sm:p-5 md:p-6 shadow-xs transition-all hover:border-border hover:shadow-sm flex flex-col justify-between min-w-0 h-full"
            >
              {/* Top Row: Icon & Title/Value */}
              <div className="flex items-start gap-1.5 sm:gap-3 min-w-0">
                <div
                  className={`flex size-8 sm:size-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl ${scheme.bg} ${scheme.icon}`}
                >
                  <IconComponent className="size-4 sm:size-5.5" />
                </div>
                <div className="flex-1 min-w-0 pt-0">
                  <span className="text-[11px] sm:text-xs md:text-sm font-medium text-muted-foreground/80 leading-tight block truncate">
                    {item.label}
                  </span>
                  <div className="text-sm sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground tabular-nums mt-0.5 sm:mt-1 truncate">
                    {item.value}
                  </div>
                </div>
              </div>

              {/* Bottom Row: Percentage comparison */}
              <div className="mt-1 sm:mt-2 flex items-center text-[10px] sm:text-xs font-medium truncate">
                {isUp && (
                  <span className="text-emerald-500 dark:text-emerald-400 flex items-center gap-0.5 sm:gap-1 truncate">
                    <ArrowUpIcon className="size-2.5 sm:size-3.5 stroke-[2.5] shrink-0" />
                    <span>{deltaClean}</span>
                    <span className="text-muted-foreground/80 ml-0.5 hidden xs:inline sm:inline truncate">{periodLabel}</span>
                  </span>
                )}
                {isDown && (
                  <span className="text-rose-500 dark:text-rose-400 flex items-center gap-0.5 sm:gap-1 truncate">
                    <ArrowDownIcon className="size-2.5 sm:size-3.5 stroke-[2.5] shrink-0" />
                    <span>{deltaClean}</span>
                    <span className="text-muted-foreground/80 ml-0.5 hidden xs:inline sm:inline truncate">{periodLabel}</span>
                  </span>
                )}
                {(isZero || item.trend === "neutral") && (
                  <span className="text-muted-foreground flex items-center gap-0.5 sm:gap-1 truncate">
                    <MinusIcon className="size-2.5 sm:size-3.5 shrink-0" />
                    <span>{isZero ? "0%" : deltaClean}</span>
                    <span className="text-muted-foreground/80 ml-0.5 hidden xs:inline sm:inline truncate">{periodLabel}</span>
                  </span>
                )}
              </div>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}

