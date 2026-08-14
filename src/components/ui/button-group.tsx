import * as React from "react"
import { cn } from "@/lib/utils"

function ButtonGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      role="group"
      data-slot="button-group"
      className={cn(
        "inline-flex items-center -space-x-px rounded-lg shadow-xs [&>button:first-child]:rounded-r-none [&>button:last-child]:rounded-l-none [&>button:not(:first-child):not(:last-child)]:rounded-none [&>button]:focus-visible:z-10",
        className
      )}
      {...props}
    />
  )
}

export { ButtonGroup }
