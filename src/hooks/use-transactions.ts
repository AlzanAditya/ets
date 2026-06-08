import { useState, useEffect, useCallback } from 'react'
import { transactionsService, type GetTransactionsParams, type TransactionWithItems, type TransactionStats, type TransactionTrendDatum, type TransactionWithRelations } from '@/services/transactions.service'

// ─── useTransactions ──────────────────────────────────────────────────────────

interface UseTransactionsResult {
  data: TransactionWithRelations[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useTransactions(params: GetTransactionsParams = {}): UseTransactionsResult {
  const [data, setData] = useState<TransactionWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const paramsKey = JSON.stringify(params)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await transactionsService.getTransactions(params)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}

// ─── useTransaction ───────────────────────────────────────────────────────────

interface UseTransactionResult {
  data: TransactionWithItems | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useTransaction(transaction_id: string | null): UseTransactionResult {
  const [data, setData] = useState<TransactionWithItems | null>(null)
  const [loading, setLoading] = useState(!!transaction_id)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!transaction_id) return
    setLoading(true)
    setError(null)
    try {
      const result = await transactionsService.getTransactionWithItems(transaction_id)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transaction details')
    } finally {
      setLoading(false)
    }
  }, [transaction_id])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}

// ─── useTransactionStats ──────────────────────────────────────────────────────

interface UseTransactionStatsResult {
  stats: TransactionStats | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useTransactionStats(): UseTransactionStatsResult {
  const [stats, setStats] = useState<TransactionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await transactionsService.getTransactionStats()
      setStats(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transaction statistics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { stats, loading, error, refetch: fetch }
}

// ─── useTransactionTrend ──────────────────────────────────────────────────────

interface UseTransactionTrendResult {
  data: TransactionTrendDatum[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useTransactionTrend(days = 7): UseTransactionTrendResult {
  const [data, setData] = useState<TransactionTrendDatum[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await transactionsService.getTransactionTrend(days)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transaction trend')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}

// ─── useRecentTransactions ────────────────────────────────────────────────────

interface UseRecentTransactionsResult {
  data: TransactionWithRelations[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useRecentTransactions(limit = 10): UseRecentTransactionsResult {
  const [data, setData] = useState<TransactionWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await transactionsService.getRecentTransactions(limit)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recent transactions')
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}
