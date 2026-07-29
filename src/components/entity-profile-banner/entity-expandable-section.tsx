import * as React from "react";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EntityExpandableSectionProps {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  badge?: React.ReactNode;
}

export function EntityExpandableSection({
  title,
  icon: Icon,
  defaultExpanded = true,
  children,
  className,
  headerClassName,
  badge,
}: EntityExpandableSectionProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  return (
    <div className={cn("rounded-2xl border border-border bg-card overflow-hidden shadow-2xs transition-all", className)}>
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className={cn(
          "w-full flex items-center justify-between p-4 sm:px-6 hover:bg-muted/40 transition-colors cursor-pointer select-none text-left",
          headerClassName
        )}
      >
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <Icon className="size-4 sm:size-5" />
            </div>
          )}
          <h3 className="font-semibold text-sm sm:text-base text-foreground tracking-tight">
            {title}
          </h3>
          {badge && <div className="ml-1">{badge}</div>}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <span className="hidden sm:inline">
            {isExpanded ? "Sembunyikan" : "Tampilkan"}
          </span>
          {isExpanded ? (
            <ChevronUpIcon className="size-4 shrink-0 transition-transform" />
          ) : (
            <ChevronDownIcon className="size-4 shrink-0 transition-transform" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 sm:px-6 pt-0 border-t border-border/40 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}
