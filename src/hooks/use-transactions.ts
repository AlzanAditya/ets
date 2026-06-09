import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import {
  transactionsService,
  type GetTransactionsParams,
  type TransactionWithItems,
  type TransactionStats,
  type TransactionTrendDatum,
  type TransactionWithRelations
} from '@/services/transactions.service'
import type { TransactionInsert } from '@/types/database'

// ─── useTransactions ──────────────────────────────────────────────────────────

interface UseTransactionsResult {
  data: TransactionWithRelations[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useTransactions(params: GetTransactionsParams = {}): UseTransactionsResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.transactions.list(params),
    queryFn: () => transactionsService.getTransactions(params),
  })

  return {
    data: data ?? [],
    loading: isLoading,
    error: error ? error.message : null,
    refetch,
  }
}

// ─── useTransaction ───────────────────────────────────────────────────────────

interface UseTransactionResult {
  data: TransactionWithItems | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useTransaction(transaction_id: string | null): UseTransactionResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.transactions.detail(transaction_id || ''),
    queryFn: () => transactionsService.getTransactionWithItems(transaction_id!),
    enabled: !!transaction_id,
  })

  return {
    data: data ?? null,
    loading: isLoading,
    error: error ? error.message : null,
    refetch,
  }
}

// ─── useTransactionStats ──────────────────────────────────────────────────────

interface UseTransactionStatsResult {
  stats: TransactionStats | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useTransactionStats(): UseTransactionStatsResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.transactions.stats(),
    queryFn: () => transactionsService.getTransactionStats(),
  })

  return {
    stats: data ?? null,
    loading: isLoading,
    error: error ? error.message : null,
    refetch,
  }
}

// ─── useTransactionTrend ──────────────────────────────────────────────────────

interface UseTransactionTrendResult {
  data: TransactionTrendDatum[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useTransactionTrend(days = 7): UseTransactionTrendResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.transactions.trend(days),
    queryFn: () => transactionsService.getTransactionTrend(days),
  })

  return {
    data: data ?? [],
    loading: isLoading,
    error: error ? error.message : null,
    refetch,
  }
}

// ─── useRecentTransactions ────────────────────────────────────────────────────

interface UseRecentTransactionsResult {
  data: TransactionWithRelations[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useRecentTransactions(limit = 10): UseRecentTransactionsResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.transactions.recent(limit),
    queryFn: () => transactionsService.getRecentTransactions(limit),
  })

  return {
    data: data ?? [],
    loading: isLoading,
    error: error ? error.message : null,
    refetch,
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateTransactionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<TransactionInsert, 'transaction_code'>) =>
      transactionsService.createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.stats() })
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.lists() })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useApproveTransactionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (transaction_id: string) =>
      transactionsService.approveTransaction(transaction_id),
    onSuccess: (updatedTxn) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.stats() })
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.detail(updatedTxn.transaction_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all }) // products branch/status changes
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useCancelTransactionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ transaction_id, reason }: { transaction_id: string; reason?: string }) =>
      transactionsService.cancelTransaction(transaction_id, reason),
    onSuccess: (updatedTxn) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.stats() })
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.detail(updatedTxn.transaction_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.lists() })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}


