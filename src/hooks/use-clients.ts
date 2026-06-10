import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { clientsService } from '@/services/clients.service'
import type { ClientRow, ClientInsert, ClientUpdate } from '@/types/database'

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

/**
 * Hook to create a new client.
 */
export function useCreateClientMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ClientInsert) => clientsService.createClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

/**
 * Hook to update an existing client.
 */
export function useUpdateClientMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ client_id, data }: { client_id: string; data: ClientUpdate }) =>
      clientsService.updateClient(client_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
