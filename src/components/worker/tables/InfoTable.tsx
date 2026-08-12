import { cn } from "@/lib/utils"

export interface InfoItem {
  label: string
  value: string | number
  isMono?: boolean
}

export interface InfoTableProps {
  items: InfoItem[]
  title?: string
  className?: string
}

export function InfoTable({ items, title, className }: InfoTableProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card text-card-foreground shadow-xs overflow-hidden",
        className
      )}
    >
      {title && (
        <div className="px-5 py-3 border-b border-border bg-muted/50">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {title}
          </h3>
        </div>
      )}

      {/* Rows with ONLY horizontal borders (border-b) */}
      <div className="divide-y divide-border/60">
        {items.map((item, index) => (
          <div
            key={item.label || index}
            className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
          >
            <span className="text-xs text-muted-foreground font-medium shrink-0">
              {item.label}
            </span>
            <span
              className={cn(
                "text-xs font-semibold text-foreground tracking-tight text-right truncate",
                item.isMono && "font-mono"
              )}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
