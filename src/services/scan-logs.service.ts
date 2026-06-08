import { supabase } from '@/lib/supabase'
import type { ScanLogRow } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScanStats {
  total_scans: number
  scans_this_month: number
  unique_products_scanned: number
}

export interface ScanTrendDatum {
  date: string   // YYYY-MM-DD
  scans: number
}

export interface ScanLogWithRelations extends ScanLogRow {
  product?: { nama_produk: string; product_code: string | null } | null
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const scanLogsService = {

  /**
   * Fetch recent scan logs across all products.
   */
  async getRecentScanLogs(limit = 50): Promise<ScanLogWithRelations[]> {
    const { data, error } = await supabase
      .from('scan_logs')
      .select('*, product:products(nama_produk, product_code)')
      .order('scanned_at', { ascending: false })
      .limit(limit)

    if (error) throw new Error(`Failed to fetch recent scan logs: ${error.message}`)
    return data ?? []
  },

  /**
   * Fetch scan logs for a specific product.
   */
  async getScanLogsByProduct(product_id: string, limit = 50): Promise<ScanLogRow[]> {
    const { data, error } = await supabase
      .from('scan_logs')
      .select('*')
      .eq('product_id', product_id)
      .order('scanned_at', { ascending: false })
      .limit(limit)

    if (error) throw new Error(`Failed to fetch scan logs: ${error.message}`)
    return data ?? []
  },

  /**
   * Get aggregate scan stats for dashboard metric card.
   */
  async getScanStats(): Promise<ScanStats> {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const [totalResult, monthResult, uniqueResult] = await Promise.all([
      supabase.from('scan_logs').select('*', { count: 'exact', head: true }),
      supabase.from('scan_logs').select('*', { count: 'exact', head: true })
        .gte('scanned_at', startOfMonth.toISOString()),
      supabase.from('scan_logs').select('product_id').not('product_id', 'is', null),
    ])

    if (totalResult.error) throw new Error(`Scan stats error: ${totalResult.error.message}`)
    if (monthResult.error) throw new Error(`Scan stats error: ${monthResult.error.message}`)
    if (uniqueResult.error) throw new Error(`Scan stats error: ${uniqueResult.error.message}`)

    const uniqueIds = new Set((uniqueResult.data ?? []).map(r => r.product_id))

    return {
      total_scans: totalResult.count ?? 0,
      scans_this_month: monthResult.count ?? 0,
      unique_products_scanned: uniqueIds.size,
    }
  },

  /**
   * Get daily scan trend for area chart.
   * Returns scan count per day for the last N days.
   */
  async getScanTrend(days: number): Promise<ScanTrendDatum[]> {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const { data, error } = await supabase
      .from('scan_logs')
      .select('scanned_at')
      .gte('scanned_at', since.toISOString())
      .order('scanned_at', { ascending: true })

    if (error) throw new Error(`Failed to fetch scan trend: ${error.message}`)

    // Aggregate by date
    const map = new Map<string, number>()
    for (const row of data ?? []) {
      const date = row.scanned_at.split('T')[0]
      map.set(date, (map.get(date) ?? 0) + 1)
    }

    // Fill all dates in range (including 0-scan days)
    const result: ScanTrendDatum[] = []
    for (let i = days; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const date = d.toISOString().split('T')[0]
      result.push({ date, scans: map.get(date) ?? 0 })
    }

    return result
  },
}
