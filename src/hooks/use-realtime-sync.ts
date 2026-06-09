import { useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'
import { queryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import type { TransactionRow, ProductRow } from '@/types/database'

/**
 * Hook to manage multi-user real-time synchronization.
 * Subscribes to Supabase Realtime channels for transactions, products, and admin row.
 * Propagates server changes into the local React Query cache surgical updates/invalidations.
 */
export function useRealtimeSync() {
  const { user, signOut } = useAuth()

  useEffect(() => {
    if (!user) return

    const userId = user.id

    // 1. Transactions channel: listen to INSERT, UPDATE, DELETE events
    const transactionsChannel = supabase
      .channel('app-transactions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        (payload) => {
          // Invalidate transaction stats and dashboard metrics
          queryClient.invalidateQueries({ queryKey: queryKeys.transactions.stats() })
          queryClient.invalidateQueries({ queryKey: queryKeys.transactions.trend(30) })
          queryClient.invalidateQueries({ queryKey: queryKeys.transactions.trend(7) })
          queryClient.invalidateQueries({ queryKey: ['dashboard'] })

          const eventType = payload.eventType
          const oldRow = payload.old as Partial<TransactionRow>
          const newRow = payload.new as TransactionRow

          // Perform surgical updates on cached transaction lists
          const queryCache = queryClient.getQueryCache()
          const queries = queryCache.findAll({
            queryKey: queryKeys.transactions.lists(),
          })

          for (const query of queries) {
            const queryKey = query.queryKey
            queryClient.setQueryData(queryKey, (oldData: any) => {
              if (!Array.isArray(oldData)) return oldData

              if (eventType === 'INSERT') {
                // Prepend the new transaction to the start of the list
                return [newRow, ...oldData]
              } else if (eventType === 'UPDATE') {
                // Update the matching transaction row inline
                return oldData.map((item: any) =>
                  item.transaction_id === newRow.transaction_id ? { ...item, ...newRow } : item
                )
              } else if (eventType === 'DELETE') {
                // Filter out the deleted transaction row
                return oldData.filter((item: any) => item.transaction_id !== oldRow.transaction_id)
              }
              return oldData
            })
          }
        }
      )
      .subscribe()

    // 2. Products channel: listen to UPDATE events only
    const productsChannel = supabase
      .channel('app-products')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products' },
        (payload) => {
          const newRow = payload.new as ProductRow

          // Invalidate product counts and dashboard metrics
          queryClient.invalidateQueries({ queryKey: queryKeys.products.count() })
          queryClient.invalidateQueries({ queryKey: ['dashboard'] })

          // Perform surgical updates on cached product lists
          const queryCache = queryClient.getQueryCache()
          const queries = queryCache.findAll({
            queryKey: queryKeys.products.lists(),
          })

          for (const query of queries) {
            const queryKey = query.queryKey
            queryClient.setQueryData(queryKey, (oldData: any) => {
              if (!Array.isArray(oldData)) return oldData
              return oldData.map((item: any) =>
                item.product_id === newRow.product_id ? { ...item, ...newRow } : item
              )
            })
          }
        }
      )
      .subscribe()

    // 3. Current user admin channel: listen to own row updates/suspensions
    const adminsChannel = supabase
      .channel(`admin-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'admins',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const newRow = payload.new as any
          if (newRow.deleted_at) {
            signOut()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(transactionsChannel)
      supabase.removeChannel(productsChannel)
      supabase.removeChannel(adminsChannel)
    }
  }, [user, signOut])
}
