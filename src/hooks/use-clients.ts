import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { clientsService } from '@/services/clients.service'
import type { ClientRow } from '@/types/database'

interface UseClientsResult {
  data: ClientRow[]
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook to fetch clients list with React Query.
 */
export function useClients(): UseClientsResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.clients.all,
    queryFn: () => clientsService.getClients(),
    staleTime: 1000 * 60 * 10, // 10 minutes staleTime (near-static data)
  })

  return {
    data: data ?? [],
    loading: isLoading,
    error: error ? error.message : null,
    refetch,
  }
}
