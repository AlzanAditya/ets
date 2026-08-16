import * as React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: "sm" | "default" | "lg" | "xl"
}

export function Spinner({
  size = "default",
  className,
  ...props
}: SpinnerProps) {
  const sizeClasses = {
    sm: "size-3.5",
    default: "size-4",
    lg: "size-6",
    xl: "size-8",
  }

  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn("inline-flex items-center justify-center text-muted-foreground", className)}
      {...props}
    >
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      <span className="sr-only">Loading...</span>
    </span>
  )
}
