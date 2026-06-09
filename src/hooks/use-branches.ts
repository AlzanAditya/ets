import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { branchesService } from '@/services/branches.service'
import type { BranchRow } from '@/types/database'

interface UseBranchesResult {
  data: BranchRow[]
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook to fetch branches list with React Query.
 */
export function useBranches(): UseBranchesResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.branches.all,
    queryFn: () => branchesService.getBranches(),
    staleTime: 1000 * 60 * 10, // 10 minutes staleTime (near-static data)
  })

  return {
    data: data ?? [],
    loading: isLoading,
    error: error ? error.message : null,
    refetch,
  }
}
