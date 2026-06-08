import { supabase } from '@/lib/supabase'
import type { TransactionRow, TransactionInsert, TransactionUpdate, TransactionItemRow, TransactionItemInsert } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GetTransactionsParams {
  status?: TransactionRow['status']
  transaction_type?: TransactionRow['transaction_type']
  client_id?: string
  branch_id?: string
  limit?: number
  offset?: number
}

export interface TransactionStats {
  total_count: number
  completed_count: number
  pending_count: number
  draft_count: number
  total_revenue: number
}

export interface TransactionTrendDatum {
  date: string      // YYYY-MM-DD
  count: number
  revenue: number
}

export interface TransactionWithRelations extends TransactionRow {
  client?: { client_name: string } | null
  source_branch?: { branch_name: string } | null
  destination_branch?: { branch_name: string } | null
}

export interface TransactionWithItems extends TransactionWithRelations {
  items: TransactionItemRow[]
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const transactionsService = {

  /**
   * Fetch transactions list with optional filters.
   */
  async getTransactions(params: GetTransactionsParams = {}): Promise<TransactionWithRelations[]> {
    const { status, transaction_type, client_id, branch_id, limit = 50, offset = 0 } = params

    let query = supabase
      .from('transactions')
      .select('*, client:clients(client_name), source_branch:branches!source_branch_id(branch_name), destination_branch:branches!destination_branch_id(branch_name)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('status', status)
    if (transaction_type) query = query.eq('transaction_type', transaction_type)
    if (client_id) query = query.eq('client_id', client_id)
    if (branch_id) {
      query = query.or(`source_branch_id.eq.${branch_id},destination_branch_id.eq.${branch_id}`)
    }

    const { data, error } = await query
    if (error) throw new Error(`Failed to fetch transactions: ${error.message}`)
    return data ?? []
  },

  /**
   * Fetch single transaction with its items.
   */
  async getTransactionWithItems(transaction_id: string): Promise<TransactionWithItems | null> {
    const { data: txn, error: txnError } = await supabase
      .from('transactions')
      .select('*')
      .eq('transaction_id', transaction_id)
      .single()

    if (txnError && txnError.code !== 'PGRST116') {
      throw new Error(`Failed to fetch transaction: ${txnError.message}`)
    }
    if (!txn) return null

    const { data: items, error: itemsError } = await supabase
      .from('transaction_items')
      .select('*')
      .eq('transaction_id', transaction_id)
      .order('created_at', { ascending: true })

    if (itemsError) throw new Error(`Failed to fetch transaction items: ${itemsError.message}`)

    return { ...txn, items: items ?? [] }
  },

  /**
   * Create a new transaction in draft status.
   */
  async createTransaction(data: TransactionInsert): Promise<TransactionRow> {
    const { data: created, error } = await supabase
      .from('transactions')
      .insert({ ...data, status: 'draft' })
      .select()
      .single()

    if (error) throw new Error(`Failed to create transaction: ${error.message}`)
    if (!created) throw new Error('Transaction creation returned no data')
    return created
  },

  /**
   * Add items to a draft/pending transaction.
   */
  async addTransactionItems(items: TransactionItemInsert[]): Promise<TransactionItemRow[]> {
    const { data, error } = await supabase
      .from('transaction_items')
      .insert(items)
      .select()

    if (error) throw new Error(`Failed to add transaction items: ${error.message}`)
    return data ?? []
  },

  /**
   * Submit a draft transaction (draft → pending).
   * Only the creator or admins can submit.
   */
  async submitTransaction(transaction_id: string): Promise<TransactionRow> {
    const { data, error } = await supabase
      .from('transactions')
      .update({
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('transaction_id', transaction_id)
      .eq('status', 'draft')
      .select()
      .single()

    if (error) throw new Error(`Failed to submit transaction: ${error.message}`)
    if (!data) throw new Error('Transaction not found or not in draft status')
    return data
  },

  /**
   * Update transaction fields (only draft/pending transactions).
   */
  async updateTransaction(transaction_id: string, data: TransactionUpdate): Promise<TransactionRow> {
    const { data: updated, error } = await supabase
      .from('transactions')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('transaction_id', transaction_id)
      .select()
      .single()

    if (error) throw new Error(`Failed to update transaction: ${error.message}`)
    if (!updated) throw new Error('Transaction update returned no data')
    return updated
  },

  /**
   * Get aggregate stats for dashboard metric cards.
   */
  async getTransactionStats(): Promise<TransactionStats> {
    const { data, error } = await supabase
      .from('transactions')
      .select('status, grand_total')

    if (error) throw new Error(`Failed to fetch transaction stats: ${error.message}`)

    const rows = data ?? []
    return {
      total_count: rows.length,
      completed_count: rows.filter(r => r.status === 'completed').length,
      pending_count: rows.filter(r => r.status === 'pending').length,
      draft_count: rows.filter(r => r.status === 'draft').length,
      total_revenue: rows
        .filter(r => r.status === 'completed')
        .reduce((sum, r) => sum + (r.grand_total ?? 0), 0),
    }
  },

  /**
   * Get daily transaction trend for area chart.
   * Returns count and revenue per day for the last N days.
   */
  async getTransactionTrend(days: number): Promise<TransactionTrendDatum[]> {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const { data, error } = await supabase
      .from('transactions')
      .select('transaction_date, grand_total')
      .eq('status', 'completed')
      .gte('transaction_date', since.toISOString().split('T')[0])
      .order('transaction_date', { ascending: true })

    if (error) throw new Error(`Failed to fetch transaction trend: ${error.message}`)

    // Aggregate by date
    const map = new Map<string, { count: number; revenue: number }>()
    for (const row of data ?? []) {
      const date = row.transaction_date
      const existing = map.get(date) ?? { count: 0, revenue: 0 }
      map.set(date, {
        count: existing.count + 1,
        revenue: existing.revenue + (row.grand_total ?? 0),
      })
    }

    // Fill missing dates with 0s
    const result: TransactionTrendDatum[] = []
    for (let i = days; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const date = d.toISOString().split('T')[0]
      const entry = map.get(date) ?? { count: 0, revenue: 0 }
      result.push({ date, ...entry })
    }

    return result
  },

  /**
   * Fetch recent transactions for dashboard table.
   */
  async getRecentTransactions(limit = 10): Promise<TransactionWithRelations[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, client:clients(client_name), source_branch:branches!source_branch_id(branch_name), destination_branch:branches!destination_branch_id(branch_name)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw new Error(`Failed to fetch recent transactions: ${error.message}`)
    return data ?? []
  },

  /**
   * Generate the next transaction code.
   * Format: TRX-YYYYMMDD-NNNN
   */
  generateTransactionCode(): string {
    const now = new Date()
    const date = now.toISOString().slice(0, 10).replace(/-/g, '')
    const rand = Math.floor(Math.random() * 9000) + 1000
    return `TRX-${date}-${rand}`
  },
}
