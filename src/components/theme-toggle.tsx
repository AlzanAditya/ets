import * as React from "react"
import { useTheme } from "next-themes"
import { Moon, SunMedium } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface ThemeToggleProps {
  className?: string
  size?: "default" | "sm" | "lg" | "icon"
  variant?: "ghost" | "outline" | "default" | "secondary"
  showLabel?: boolean
}

export function ThemeToggle({
  className,
  size = "icon",
  variant = "ghost",
  showLabel = false,
}: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted ? resolvedTheme === "dark" : false

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark")
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={toggleTheme}
      aria-label={isDark ? "Beralih ke mode terang" : "Beralih ke mode gelap"}
      title={isDark ? "Beralih ke mode terang" : "Beralih ke mode gelap"}
      className={cn(
        "relative rounded-xl transition-colors duration-200",
        "text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white",
        "hover:bg-slate-200/70 dark:hover:bg-zinc-800/80",
        className
      )}
    >
      <span className="sr-only">Toggle theme</span>
      {mounted ? (
        isDark ? (
          <SunMedium className="h-4 w-4 sm:h-[18px] sm:w-[18px] text-amber-400 transition-transform duration-200 rotate-0 scale-100" />
        ) : (
          <Moon className="h-4 w-4 sm:h-[18px] sm:w-[18px] text-slate-700 dark:text-zinc-300 transition-transform duration-200 rotate-0 scale-100" />
        )
      ) : (
        <div className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
      )}
      {showLabel && (
        <span className="ml-2 text-xs font-medium">
          {mounted ? (isDark ? "Mode Terang" : "Mode Gelap") : "Tema"}
        </span>
      )}
    </Button>
  )
}
