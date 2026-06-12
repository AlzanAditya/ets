import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { MetricCardItem } from "@/types/metrics"
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react"

const placeholderCards = [
  {
    label: "Sample Metric",
    value: "0",
    delta: "+0%",
    trend: "up",
    summary: "Sample trend summary",
    description: "Placeholder description for development preview",
    icon: TrendingUpIcon,
  },
] satisfies MetricCardItem[]

/**
 * Purpose: render a responsive row of metric summary cards.
 * Responsibilities: display labels, values, trend badges, and short summaries.
 * Expected props: metric card items supplied by a page or feature.
 * Usage notes:
 *   – Falls back to generic placeholder data for isolated previews.
 *   – On mobile: 2-column grid, CardFooter (summary + description) is hidden
 *     to keep cards compact.
 */
export function MetricCards({ items = placeholderCards }: { items?: MetricCardItem[] }) {
  return (
    <div
      className={[
        // Mobile: 2 columns, tighter gap
        "grid grid-cols-2 gap-2",
        // sm+: revert to 1 column, normal gap (container queries take over)
        "sm:grid-cols-1 sm:gap-4",
        "px-4",
        "*:data-[slot=card]:bg-gradient-to-t",
        "*:data-[slot=card]:from-primary/5",
        "*:data-[slot=card]:to-card",
        "*:data-[slot=card]:shadow-xs",
        "lg:px-6",
        "@xl/main:grid-cols-2",
        "@5xl/main:grid-cols-4",
        "dark:*:data-[slot=card]:bg-card",
      ].join(" ")}
    >
      {items.map((item) => {
        const TrendIcon =
          item.icon ?? (item.trend === "down" ? TrendingDownIcon : TrendingUpIcon)

        return (
          <Card className="@container/card" key={item.label}>
            <CardHeader className="gap-1 pb-2 sm:pb-4">
              {/* Label — slightly smaller on mobile */}
              <CardDescription className="text-xs sm:text-sm">
                {item.label}
              </CardDescription>
              {/* Value — smaller on mobile to fit 2-column layout */}
              <CardTitle className="text-lg font-semibold tabular-nums sm:text-2xl @[250px]/card:text-3xl">
                {item.value}
              </CardTitle>
              <CardAction>
                <Badge variant="outline" className="text-[10px] sm:text-xs gap-0.5 px-1.5 py-0.5">
                  <TrendIcon className="size-3" />
                  {item.delta}
                </Badge>
              </CardAction>
            </CardHeader>
            {/* CardFooter: hidden on mobile to keep cards compact */}
            <CardFooter className="hidden sm:flex flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                {item.summary} <TrendIcon className="size-4" />
              </div>
              <div className="text-muted-foreground">{item.description}</div>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
