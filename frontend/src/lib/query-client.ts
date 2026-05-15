'use client';

import {
  QueryClient,
  QueryCache,
  MutationCache,
  type QueryClientConfig,
} from '@tanstack/react-query';

// ─── Constants ───────────────────────────────────────────────

const STALE_TIME_MS = 5 * 60 * 1000;       // 5 minutes
const GC_TIME_MS = 10 * 60 * 1000;         // 10 minutes (formerly cacheTime)
const RETRY_COUNT = 2;
const RETRY_DELAY_MS = 1000;

// ─── Default Config ──────────────────────────────────────────

const defaultQueryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      // Data stays fresh for 5 minutes
      staleTime: STALE_TIME_MS,
      // Keep unused data in cache for 10 minutes
      gcTime: GC_TIME_MS,
      // Retry failed queries 2 times
      retry: RETRY_COUNT,
      // Exponential backoff for retries
      retryDelay: (attemptIndex: number) =>
        Math.min(RETRY_DELAY_MS * 2 ** attemptIndex, 30000),
      // Refetch on window focus (disable for better UX)
      refetchOnWindowFocus: false,
      // Refetch on reconnect
      refetchOnReconnect: true,
      // Don't refetch on mount if data is fresh
      refetchOnMount: 'always',
      // Keep previous data while loading new data
      placeholderData: (previousData: unknown) => previousData,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      retryDelay: RETRY_DELAY_MS,
    },
  },
};

// ─── Global Error Handlers ───────────────────────────────────

function handleQueryError(error: unknown) {
  const message =
    error instanceof Error ? error.message : 'An unknown error occurred';

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[React Query] Query error:', error);
  }

  // In production, errors are handled per-component via error states
  // The global handler is for logging/monitoring only
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to error monitoring service (Sentry, LogRocket, etc.)
    console.error('[React Query] Global query error:', message);
  }
}

function handleMutationError(
  error: unknown,
  _variables: unknown,
  _context: unknown
) {
  const message =
    error instanceof Error ? error.message : 'An unknown error occurred';

  if (process.env.NODE_ENV === 'development') {
    console.error('[React Query] Mutation error:', error);
  }

  if (process.env.NODE_ENV === 'production') {
    console.error('[React Query] Global mutation error:', message);
  }
}

// ─── Create Query Client ─────────────────────────────────────

export function createQueryClient(): QueryClient {
  return new QueryClient({
    ...defaultQueryClientConfig,
    queryCache: new QueryCache({
      onError: handleQueryError,
    }),
    mutationCache: new MutationCache({
      onError: handleMutationError,
    }),
  });
}

// ─── Singleton (for client-side) ─────────────────────────────

let queryClientInstance: QueryClient | null = null;

export function getQueryClient(): QueryClient {
  if (!queryClientInstance) {
    queryClientInstance = createQueryClient();
  }
  return queryClientInstance;
}

// ─── Invalidate helpers ──────────────────────────────────────

/**
 * Helper to invalidate multiple query keys at once.
 * Usage: invalidateQueries(queryClient, ['wallet', 'transactions', 'user'])
 */
export function invalidateQueries(
  client: QueryClient,
  keys: string[][]
): Promise<void> {
  return Promise.all(
    keys.map((key) => client.invalidateQueries({ queryKey: key }))
  ).then(() => undefined);
}

/**
 * Prefetch a query for instant navigation.
 * Usage: prefetchQuery(queryClient, ['products'], () => GemZApi.Store.getProducts())
 */
export async function prefetchQuery<T>(
  client: QueryClient,
  queryKey: string[],
  fetcher: () => Promise<T>
): Promise<void> {
  await client.prefetchQuery({
    queryKey,
    queryFn: fetcher,
    staleTime: STALE_TIME_MS,
  });
}

export { STALE_TIME_MS, GC_TIME_MS, RETRY_COUNT };
