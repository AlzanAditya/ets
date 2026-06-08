import { useState, useEffect, useCallback } from 'react'
import { productsService, type GetProductsParams, type ProductWithRelations } from '@/services/products.service'
import type { ProductRow } from '@/types/database'

// ─── useProducts ──────────────────────────────────────────────────────────────

interface UseProductsResult {
  data: ProductWithRelations[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useProducts(params: GetProductsParams = {}): UseProductsResult {
  const [data, setData] = useState<ProductWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Stable key for dependency tracking
  const paramsKey = JSON.stringify(params)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await productsService.getProducts(params)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products')
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

// ─── useProduct (single) ──────────────────────────────────────────────────────

interface UseProductResult {
  data: ProductRow | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useProduct(product_id: string | null): UseProductResult {
  const [data, setData] = useState<ProductRow | null>(null)
  const [loading, setLoading] = useState(!!product_id)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!product_id) return
    setLoading(true)
    setError(null)
    try {
      const result = await productsService.getProductById(product_id)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product')
    } finally {
      setLoading(false)
    }
  }, [product_id])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}

// ─── useProductCount ──────────────────────────────────────────────────────────

interface UseProductCountResult {
  count: number
  loading: boolean
  error: string | null
}

export function useProductCount(status?: ProductRow['status']): UseProductCountResult {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    productsService.getProductCount(status)
      .then(c => { if (!cancelled) { setCount(c); setLoading(false) } })
      .catch(err => { if (!cancelled) { setError(err.message); setLoading(false) } })

    return () => { cancelled = true }
  }, [status])

  return { count, loading, error }
}

// ─── useRecentProducts ────────────────────────────────────────────────────────

interface UseRecentProductsResult {
  data: ProductRow[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useRecentProducts(limit = 10): UseRecentProductsResult {
  const [data, setData] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await productsService.getRecentProducts(limit)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recent products')
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}
