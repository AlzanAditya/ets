import { useState, useEffect, useCallback } from 'react'
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
  const [data, setData] = useState<ScanLogRow[]>([])
  const [loading, setLoading] = useState(!!product_id)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!product_id) return
    setLoading(true)
    setError(null)
    try {
      const result = await scanLogsService.getScanLogsByProduct(product_id, limit)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scan logs')
    } finally {
      setLoading(false)
    }
  }, [product_id, limit])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}

// ─── useScanStats ─────────────────────────────────────────────────────────────

interface UseScanStatsResult {
  stats: ScanStats | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useScanStats(): UseScanStatsResult {
  const [stats, setStats] = useState<ScanStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await scanLogsService.getScanStats()
      setStats(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scan stats')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { stats, loading, error, refetch: fetch }
}

// ─── useScanTrend ─────────────────────────────────────────────────────────────

interface UseScanTrendResult {
  data: ScanTrendDatum[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useScanTrend(days = 7): UseScanTrendResult {
  const [data, setData] = useState<ScanTrendDatum[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await scanLogsService.getScanTrend(days)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scan trend')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}

// ─── useRecentScanLogs ────────────────────────────────────────────────────────

interface UseRecentScanLogsResult {
  data: ScanLogWithRelations[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useRecentScanLogs(limit = 50): UseRecentScanLogsResult {
  const [data, setData] = useState<ScanLogWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await scanLogsService.getRecentScanLogs(limit)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recent scan logs')
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}
