import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,      // 2 min global default
      gcTime: 1000 * 60 * 10,       // 10 min garbage collection
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      refetchOnWindowFocus: false,  // Realtime handles sync — window focus refetch is redundant
      refetchOnReconnect: true,     // Reconnect = possible missed Realtime events → refetch
    },
  },
})
