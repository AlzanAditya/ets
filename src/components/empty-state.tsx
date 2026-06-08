import { FolderOpenIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  icon: Icon = FolderOpenIcon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center animate-fade-in bg-card/30 backdrop-blur-[2px]">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/60 text-muted-foreground ring-8 ring-muted/20">
        <Icon className="h-10 w-10 stroke-[1.5]" />
      </div>
      <h3 className="mt-6 text-xl font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-6 font-medium shadow-md shadow-primary/10 transition-all hover:shadow-lg hover:shadow-primary/20">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
