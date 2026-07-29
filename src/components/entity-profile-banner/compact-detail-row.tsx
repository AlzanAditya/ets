import * as React from "react";
import { cn } from "@/lib/utils";

export interface CompactDetailRowProps {
  label: string;
  value?: React.ReactNode;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  isFullWidth?: boolean;
}

/**
 * CompactDetailRow displays key-value information in a sleek, compact read-only format.
 * Format: [Label]                 [Value]
 */
export function CompactDetailRow({
  label,
  value,
  className,
  labelClassName,
  valueClassName,
  isFullWidth = false,
}: CompactDetailRowProps) {
  const displayVal =
    value !== null && value !== undefined && String(value).trim() !== ""
      ? value
      : "—";

  return (
    <div
      className={cn(
        "flex flex-row items-center justify-between gap-3 text-xs sm:text-sm py-1.5 border-b border-border/40 last:border-0",
        isFullWidth && "col-span-full",
        className
      )}
    >
      <span className={cn("text-muted-foreground font-medium shrink-0", labelClassName)}>
        {label}
      </span>
      <span className={cn("text-foreground font-medium text-right break-words", valueClassName)}>
        {displayVal}
      </span>
    </div>
  );
}
