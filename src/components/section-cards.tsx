import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { MetricCardItem } from "@/types/dashboard"
import { TrendingUpIcon, TrendingDownIcon } from "lucide-react"

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
 * Purpose: render a responsive row of KPI summary cards.
 * Responsibilities: display labels, values, trend badges, and short summaries.
 * Expected props: metric card items supplied by a page or feature.
 * Usage notes: falls back to generic placeholder data for isolated previews.
 */
export function SectionCards({ items = placeholderCards }: { items?: MetricCardItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      {items.map((item) => {
        const TrendIcon =
          item.icon ?? (item.trend === "down" ? TrendingDownIcon : TrendingUpIcon)

        return (
          <Card className="@container/card" key={item.label}>
            <CardHeader>
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {item.value}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <TrendIcon />
                  {item.delta}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
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
