import { CalendarIcon, SunriseIcon, SunIcon, SunsetIcon, MoonIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export type TimeRangeOption = "1d" | "1w" | "1m" | "6m" | "1y"

export const TIME_RANGE_LABELS: Record<TimeRangeOption, { buttonLabel: string; descLabel: string }> = {
  "1d": { buttonLabel: "Hari ini", descLabel: "ringkasan data hari ini" },
  "1w": { buttonLabel: "1 Minggu", descLabel: "ringkasan data 1 minggu" },
  "1m": { buttonLabel: "1 Bulan", descLabel: "ringkasan data 1 bulan" },
  "6m": { buttonLabel: "6 Bulan", descLabel: "ringkasan data 6 bulan" },
  "1y": { buttonLabel: "1 Tahun", descLabel: "ringkasan data 1 tahun" },
}

interface GreetingCardProps {
  userName?: string
  selectedRange?: TimeRangeOption
  onRangeChange?: (range: TimeRangeOption) => void
  className?: string
}

export function GreetingCard({
  userName = "Admin",
  selectedRange = "1d",
  onRangeChange,
  className = "",
}: GreetingCardProps) {
  const currentRange = TIME_RANGE_LABELS[selectedRange] || TIME_RANGE_LABELS["1d"]

  // Determine Greeting Text & Icon based on current time
  const hour = new Date().getHours()
  let greetingText = `Selamat pagi, ${userName}!`
  let TimeIcon = SunriseIcon
  let iconBg = "bg-amber-500/20 border-amber-500/30 text-amber-500 dark:text-amber-400"

  if (hour >= 11 && hour < 15) {
    greetingText = `Selamat siang, ${userName}!`
    TimeIcon = SunIcon
    iconBg = "bg-yellow-500/20 border-yellow-500/30 text-yellow-500 dark:text-yellow-400"
  } else if (hour >= 15 && hour < 18) {
    greetingText = `Selamat sore, ${userName}!`
    TimeIcon = SunsetIcon
    iconBg = "bg-orange-500/20 border-orange-500/30 text-orange-500 dark:text-orange-400"
  } else if (hour >= 18 || hour < 5) {
    greetingText = `Selamat malam, ${userName}!`
    TimeIcon = MoonIcon
    iconBg = "bg-indigo-500/20 border-indigo-500/30 text-indigo-400 dark:text-indigo-300"
  }

  return (
    <div
      className={`w-full rounded-2xl border border-border/80 bg-card/90 p-3 sm:p-5 shadow-sm backdrop-blur-sm flex flex-row items-center justify-between gap-2 sm:gap-4 ${className}`}
    >
      {/* Left side: Profile Adaptive Icon + Greeting & Description */}
      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
        <div className={`flex size-10 sm:size-14 shrink-0 items-center justify-center rounded-full border shadow-xs transition-colors ${iconBg}`}>
          <TimeIcon className="size-5 sm:size-7 shrink-0" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm sm:text-xl font-bold tracking-tight text-foreground truncate">
            {greetingText}
          </h2>
          <p className="text-[11px] sm:text-sm text-muted-foreground mt-0.5 capitalize truncate">
            {currentRange.descLabel}
          </p>
        </div>
      </div>

      {/* Right side: Time Range Dropdown Selector */}
      <div className="shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 sm:h-9 px-2.5 sm:px-3.5 gap-1.5 border-border/80 hover:bg-muted/80 text-xs sm:text-sm font-medium rounded-xl shadow-2xs"
            >
              <CalendarIcon className="size-3.5 sm:size-4 text-emerald-500" />
              <span>{currentRange.buttonLabel}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 sm:w-40 rounded-xl">
            {(Object.keys(TIME_RANGE_LABELS) as TimeRangeOption[]).map((key) => (
              <DropdownMenuItem
                key={key}
                onClick={() => onRangeChange?.(key)}
                className={`text-xs sm:text-sm cursor-pointer ${
                  selectedRange === key ? "font-semibold text-emerald-500 bg-emerald-500/10" : ""
                }`}
              >
                {TIME_RANGE_LABELS[key].buttonLabel}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

