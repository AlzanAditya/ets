import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { productsService, type GetProductsParams, type ProductWithRelations } from '@/services/products.service'
import type { ProductRow, ProductInsert, ProductUpdate } from '@/types/database'

// ─── useProducts ──────────────────────────────────────────────────────────────

interface UseProductsResult {
  data: ProductWithRelations[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useProducts(params: GetProductsParams = {}): UseProductsResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: () => productsService.getProducts(params),
  })

  return {
    data: data ?? [],
    loading: isLoading,
    error: error ? error.message : null,
    refetch,
  }
}

// ─── useProduct (single) ──────────────────────────────────────────────────────

interface UseProductResult {
  data: ProductRow | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useProduct(product_id: string | null): UseProductResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.products.detail(product_id || ''),
    queryFn: () => productsService.getProductById(product_id!),
    enabled: !!product_id,
  })

  return {
    data: data ?? null,
    loading: isLoading,
    error: error ? error.message : null,
    refetch,
  }
}

// ─── useProductCount ──────────────────────────────────────────────────────────

interface UseProductCountResult {
  count: number
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useProductCount(status?: ProductRow['status']): UseProductCountResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.products.count(status),
    queryFn: () => productsService.getProductCount(status),
  })

  return {
    count: data ?? 0,
    loading: isLoading,
    error: error ? error.message : null,
    refetch,
  }
}

// ─── useRecentProducts ────────────────────────────────────────────────────────

interface UseRecentProductsResult {
  data: ProductRow[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useRecentProducts(limit = 10): UseRecentProductsResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.products.recent(limit),
    queryFn: () => productsService.getRecentProducts(limit),
  })

  return {
    data: data ?? [],
    loading: isLoading,
    error: error ? error.message : null,
    refetch,
  }
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateProductMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ProductInsert) => productsService.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.products.count() })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateProductMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ product_id, data }: { product_id: string; data: ProductUpdate }) =>
      productsService.updateProduct(product_id, data),
    onSuccess: (updatedProduct) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(updatedProduct.product_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.products.count() })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}


