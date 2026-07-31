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
        "rounded-2xl border border-slate-800 bg-[#162028] text-slate-100 shadow-xs overflow-hidden",
        className
      )}
    >
      {title && (
        <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-900/50">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {title}
          </h3>
        </div>
      )}

      {/* Rows with ONLY horizontal borders (border-b) */}
      <div className="divide-y divide-slate-800/60">
        {items.map((item, index) => (
          <div
            key={item.label || index}
            className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-800/30 transition-colors"
          >
            <span className="text-xs text-slate-400 font-medium shrink-0">
              {item.label}
            </span>
            <span
              className={cn(
                "text-xs font-semibold text-slate-200 tracking-tight text-right truncate",
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
