export function PageContentSkeleton() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-44 rounded-md bg-muted/80" />
          <div className="h-3.5 w-64 rounded-md bg-muted/50" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-md bg-muted/60" />
          <div className="h-9 w-28 rounded-md bg-muted/80" />
        </div>
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="h-24 rounded-xl border border-border/50 bg-card/40 p-4" />
        <div className="h-24 rounded-xl border border-border/50 bg-card/40 p-4" />
        <div className="h-24 rounded-xl border border-border/50 bg-card/40 p-4" />
        <div className="h-24 rounded-xl border border-border/50 bg-card/40 p-4" />
      </div>
      <div className="h-72 rounded-xl border border-border/50 bg-card/40" />
    </div>
  )
}
