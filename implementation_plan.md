# Implementation Plan: React Query Integration for Caching and Optimized Updates

This plan outlines the migration from manual `useState`/`useEffect` data fetching to `@tanstack/react-query`. The primary focus is on efficient caching and ensuring that adding/updating data does not trigger a full table refetch, but instead performs targeted cache updates.

## 1. Dependencies Installation
- Install `@tanstack/react-query` for state management.
- Install `@tanstack/react-query-devtools` for debugging.

## 2. Infrastructure Setup
### 2.1. Query Client Provider
Wrap the application in `QueryClientProvider` within `src/main.tsx`.
- Configure default options (e.g., `staleTime: 1000 * 60 * 5` to keep data fresh for 5 minutes).

### 2.2. Query Key Factory
Create `src/lib/query-keys.ts` to manage all cache keys centrally. This ensures consistency and makes invalidation/updates easier.
Example:
```typescript
export const queryKeys = {
  products: {
    all: ['products'] as const,
    list: (params: any) => [...queryKeys.products.all, 'list', params] as const,
    detail: (id: string) => [...queryKeys.products.all, 'detail', id] as const,
  },
  transactions: {
    all: ['transactions'] as const,
    list: (params: any) => [...queryKeys.transactions.all, 'list', params] as const,
    stats: ['transactions', 'stats'] as const,
  },
  // ... other keys
}
```

## 3. Hook Refactoring Strategy
Each custom hook in `src/hooks/` will be refactored to use `useQuery` for data fetching.

### 3.1. Reading Data (useQuery)
Example refactor for `useProducts`:
```typescript
export function useProducts(params: GetProductsParams = {}) {
  return useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: () => productsService.getProducts(params),
  })
}
```

### 3.2. Writing Data (useMutation + Targeted Cache Update)
To satisfy the requirement of **not fetching the entire table when 1 new data is added**, we will use `queryClient.setQueryData` in the `onSuccess` callback of mutations.

**Approach for `createProduct`:**
1.  Perform the API call.
2.  On success, get the newly created item.
3.  Update the relevant list query in the cache manually.

```typescript
export function useCreateProduct() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: ProductInsert) => productsService.createProduct(data),
    onSuccess: (newProduct) => {
      // 1. Update the 'all' list or specific list if possible
      // We can use queryClient.setQueriesData to update multiple lists that might contain this product
      queryClient.setQueriesData<ProductRow[]>(
        { queryKey: queryKeys.products.all },
        (oldData) => {
          if (!oldData) return [newProduct]
          return [newProduct, ...oldData] // Add to start of list
        }
      )
      
      // 2. Also update relevant stats if necessary
      queryClient.invalidateQueries({ queryKey: queryKeys.products.stats })
    }
  })
}
```

## 4. Migration Phases

### Phase 1: Setup & Products
- Install dependencies.
- Setup `QueryClientProvider`.
- Refactor `src/hooks/use-products.ts` to use `useQuery` and add `useMutation` hooks.
- Update components using these hooks.

### Phase 2: Transactions & Stats
- Refactor `src/hooks/use-transactions.ts`.
- Implement `useMutation` for transactions.
- Handle `useTransactionStats` and ensures it stays in sync.

### Phase 3: Other Services
- Refactor `use-scan-logs.ts`, `use-branches.ts`, `use-clients.ts`, etc.
- Cleanup old manual fetching logic.

## 5. Verification Plan
- **Caching**: Navigate between pages and verify that data is loaded from cache (no loading spinner on second visit).
- **Targeted Update**: Add a new product and verify it appears in the table immediately without a "network fetch" for the entire list (verify via DevTools).
- **Error Handling**: Verify that API errors are still caught and displayed correctly via the `error` state from React Query.
