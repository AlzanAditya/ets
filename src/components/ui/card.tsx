import * as React from "react"

import { cn } from "@/lib/utils"

function Card({
  className,
  size = "default",
  status = "default",
  ...props
}: React.ComponentProps<"div"> & { 
  size?: "default" | "sm";
  status?: "success" | "danger" | "warning" | "info" | "default";
}) {
  const statusStyles = {
    success: "bg-emerald-500/[0.04] dark:bg-emerald-500/[0.08] ring-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/10",
    danger: "bg-destructive/[0.04] dark:bg-destructive/[0.08] ring-destructive/20 text-destructive border-destructive/10",
    warning: "bg-amber-500/[0.04] dark:bg-amber-500/[0.08] ring-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/10",
    info: "bg-blue-500/[0.04] dark:bg-blue-500/[0.08] ring-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/10",
    default: "",
  };

  return (
    <div
      data-slot="card"
      data-size={size}
      data-status={status}
      className={cn(
        "group/card flex flex-col gap-4 overflow-hidden rounded-xl bg-card py-4 text-sm text-card-foreground ring-1 ring-foreground/10 has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        statusStyles[status],
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-4 group-data-[size=sm]/card:px-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4 group-data-[size=sm]/card:px-3", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl border-t bg-muted/50 p-4 group-data-[size=sm]/card:p-3",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
