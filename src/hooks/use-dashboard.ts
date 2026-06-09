import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { productsService } from '@/services/products.service'
import { transactionsService } from '@/services/transactions.service'
import { scanLogsService } from '@/services/scan-logs.service'
import type { ProductRow, TransactionRow } from '@/types/database'

interface DashboardData {
  metrics: {
    totalRevenue: number
    revenueTrend: { delta: string; trend: 'up' | 'down' }
    totalScans: number
    scansThisMonth: number
    activeAssets: number
    totalAssets: number
  }
  chartData: {
    date: string
    desktop: number // revenue
    mobile: number  // scans
  }[]
  recentTransactions: TransactionRow[]
  recentProducts: ProductRow[]
}

interface UseDashboardResult {
  data: DashboardData | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useDashboard(days = 30): UseDashboardResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.dashboard(days),
    queryFn: async (): Promise<DashboardData> => {
      const [
        totalAssets,
        activeAssets,
        txnStats,
        scanStats,
        scanTrend,
        txnTrend,
        recentTxns,
        recentProducts,
      ] = await Promise.all([
        productsService.getProductCount(), // All non-retired
        productsService.getProductCount('active'), // Active
        transactionsService.getTransactionStats(),
        scanLogsService.getScanStats(),
        scanLogsService.getScanTrend(days),
        transactionsService.getTransactionTrend(days),
        transactionsService.getRecentTransactions(5),
        productsService.getRecentProducts(5),
      ])

      // Combine trend data by date
      const trendMap = new Map<string, { scans: number; revenue: number }>()
      
      // Initialize with dates from scan trend
      scanTrend.forEach(d => {
        trendMap.set(d.date, { scans: d.scans, revenue: 0 })
      })

      // Overlay transaction trend (revenue)
      txnTrend.forEach(d => {
        const existing = trendMap.get(d.date) ?? { scans: 0, revenue: 0 }
        trendMap.set(d.date, {
          scans: existing.scans,
          revenue: d.revenue,
        })
      })

      // Convert map back to sorted array of data points matching AreaChartDatum
      const chartData = Array.from(trendMap.entries())
        .map(([date, values]) => ({
          date,
          desktop: values.revenue, // Desktop -> Revenue
          mobile: values.scans,     // Mobile -> Scans
        }))
        .sort((a, b) => a.date.localeCompare(b.date))

      // Simple dummy trend calculations for metrics
      const revenueDelta = "+8.4%"
      const revenueTrendSign = "up"

      return {
        metrics: {
          totalRevenue: txnStats.total_revenue,
          revenueTrend: { delta: revenueDelta, trend: revenueTrendSign },
          totalScans: scanStats.total_scans,
          scansThisMonth: scanStats.scans_this_month,
          activeAssets,
          totalAssets,
        },
        chartData,
        recentTransactions: recentTxns,
        recentProducts,
      }
    }
  })

  return {
    data: data ?? null,
    loading: isLoading,
    error: error ? error.message : null,
    refetch,
  }
}

