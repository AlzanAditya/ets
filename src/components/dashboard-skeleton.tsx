import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* 4 Metric cards skeletons */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 px-4 lg:px-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="overflow-hidden shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[120px]" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-8 w-[100px]" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-3 w-[120px]" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main chart area skeleton */}
      <div className="px-4 lg:px-6">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
            <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
              <Skeleton className="h-6 w-[180px]" />
              <Skeleton className="h-4 w-[240px] mt-1" />
            </div>
            <div className="flex">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="relative flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left sm:border-l sm:border-t-0 sm:px-8 sm:py-6"
                >
                  <Skeleton className="h-3 w-[80px]" />
                  <Skeleton className="h-6 w-[60px] mt-1" />
                </div>
              ))}
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:p-6">
            <div className="flex h-[350px] items-end gap-2 px-4 py-8">
              {Array.from({ length: 20 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="w-full rounded-t-md bg-muted-foreground/10"
                  style={{
                    height: `${Math.floor(Math.random() * 60) + 20}%`,
                  }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent data table skeleton */}
      <div className="px-4 lg:px-6">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <Skeleton className="h-5 w-[150px]" />
              <Skeleton className="h-4 w-[250px]" />
            </div>
            <Skeleton className="h-9 w-[120px]" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-[180px]" />
                    <Skeleton className="h-3 w-[120px]" />
                  </div>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-4 w-[80px]" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
