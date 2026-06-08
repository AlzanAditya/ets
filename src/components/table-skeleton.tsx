import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface TableSkeletonProps {
  columnCount?: number
  rowCount?: number
  showHeader?: boolean
}

export function TableSkeleton({
  columnCount = 5,
  rowCount = 5,
  showHeader = true,
}: TableSkeletonProps) {
  return (
    <div className="w-full space-y-4 rounded-xl border bg-card p-6 shadow-sm">
      {/* Search and filter controls skeleton */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <Skeleton className="h-10 w-full sm:w-[250px]" />
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Skeleton className="h-10 w-[120px]" />
          <Skeleton className="h-10 w-[120px]" />
        </div>
      </div>

      {/* Table grid skeleton */}
      <div className="rounded-md border">
        <Table>
          {showHeader && (
            <TableHeader>
              <TableRow>
                {Array.from({ length: columnCount }).map((_, i) => (
                  <TableHead key={i}>
                    <Skeleton className="h-4 w-[100px]" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
          )}
          <TableBody>
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {Array.from({ length: columnCount }).map((_, colIndex) => (
                  <TableCell key={colIndex}>
                    <Skeleton
                      className={`h-4 ${
                        colIndex === 0
                          ? "w-[120px]"
                          : colIndex === columnCount - 1
                          ? "w-[80px]"
                          : "w-[100px]"
                      }`}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination control skeleton */}
      <div className="flex items-center justify-between py-2">
        <Skeleton className="h-4 w-[150px]" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-[80px]" />
          <Skeleton className="h-8 w-[80px]" />
        </div>
      </div>
    </div>
  )
}
