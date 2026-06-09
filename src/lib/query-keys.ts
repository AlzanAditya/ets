export const queryKeys = {
  transactions: {
    all: ['transactions'] as const,
    lists: () => [...queryKeys.transactions.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.transactions.lists(), filters] as const,
    details: () => [...queryKeys.transactions.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.transactions.details(), id] as const,
    stats: () => [...queryKeys.transactions.all, 'stats'] as const,
    trend: (days: number) => [...queryKeys.transactions.all, 'trend', days] as const,
    recent: (limit: number) => [...queryKeys.transactions.all, 'recent', limit] as const,
  },
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.products.lists(), filters] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
    count: (status?: string) => [...queryKeys.products.all, 'count', status || 'all'] as const,
    recent: (limit: number) => [...queryKeys.products.all, 'recent', limit] as const,
  },
  scanLogs: {
    all: ['scan_logs'] as const,
    byProduct: (productId: string, limit: number) => [...queryKeys.scanLogs.all, 'product', productId, limit] as const,
    stats: () => [...queryKeys.scanLogs.all, 'stats'] as const,
    trend: (days: number) => [...queryKeys.scanLogs.all, 'trend', days] as const,
    recent: (limit: number) => [...queryKeys.scanLogs.all, 'recent', limit] as const,
  },
  branches: {
    all: ['branches'] as const,
    lists: () => [...queryKeys.branches.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.branches.lists(), filters] as const,
  },
  clients: {
    all: ['clients'] as const,
    lists: () => [...queryKeys.clients.all, 'list'] as const,
    list: (filters: any) => [...queryKeys.clients.lists(), filters] as const,
  },
  dashboard: (days: number) => ['dashboard', days] as const,
} as const
