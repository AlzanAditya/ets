import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { scanLogsService, type ScanStats, type ScanTrendDatum, type ScanLogWithRelations } from '@/services/scan-logs.service'
import type { ScanLogRow } from '@/types/database'

// ─── useScanLogsByProduct ─────────────────────────────────────────────────────

interface UseScanLogsByProductResult {
  data: ScanLogRow[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useScanLogsByProduct(product_id: string | null, limit = 50): UseScanLogsByProductResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.scanLogs.byProduct(product_id || '', limit),
    queryFn: () => scanLogsService.getScanLogsByProduct(product_id!, limit),
    enabled: !!product_id,
  })

  return {
    data: data ?? [],
    loading: isLoading,
    error: error ? error.message : null,
    refetch,
  }
}

// ─── useScanStats ─────────────────────────────────────────────────────────────

interface UseScanStatsResult {
  stats: ScanStats | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useScanStats(): UseScanStatsResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.scanLogs.stats(),
    queryFn: () => scanLogsService.getScanStats(),
    staleTime: 1000 * 30,       // 30 seconds acceptable freshness for stats view
    refetchInterval: 1000 * 60, // poll every 60 seconds when page is visible
  })

  return {
    stats: data ?? null,
    loading: isLoading,
    error: error ? error.message : null,
    refetch,
  }
}

// ─── useScanTrend ─────────────────────────────────────────────────────────────

interface UseScanTrendResult {
  data: ScanTrendDatum[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useScanTrend(days = 7): UseScanTrendResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.scanLogs.trend(days),
    queryFn: () => scanLogsService.getScanTrend(days),
  })

  return {
    data: data ?? [],
    loading: isLoading,
    error: error ? error.message : null,
    refetch,
  }
}

// ─── useRecentScanLogs ────────────────────────────────────────────────────────

interface UseRecentScanLogsResult {
  data: ScanLogWithRelations[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useRecentScanLogs(limit = 50): UseRecentScanLogsResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.scanLogs.recent(limit),
    queryFn: () => scanLogsService.getRecentScanLogs(limit),
    staleTime: 1000 * 30,       // 30 seconds staleTime
    refetchInterval: 1000 * 30, // poll every 30 seconds
  })

  return {
    data: data ?? [],
    loading: isLoading,
    error: error ? error.message : null,
    refetch,
  }
}

