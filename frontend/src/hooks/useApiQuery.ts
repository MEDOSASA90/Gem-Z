'use client';

import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
  type QueryKey,
} from '@tanstack/react-query';
import { useToast } from '@/components/ui/ToastProvider';

// ─── Types ───────────────────────────────────────────────────

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

type QueryFn<T> = () => Promise<T>;
type MutationFn<TVariables, TData> = (variables: TVariables) => Promise<TData>;

interface UseApiQueryOptions<T>
  extends Omit<UseQueryOptions<T, Error, T, QueryKey>, 'queryKey' | 'queryFn'> {
  /** Query key for caching */
  queryKey: string[];
  /** Query function */
  queryFn: QueryFn<T>;
  /** Show toast on error */
  showErrorToast?: boolean;
  /** Custom error message */
  errorMessage?: string;
}

interface UseApiMutationOptions<TVariables, TData>
  extends Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'> {
  /** Mutation function */
  mutationFn: MutationFn<TVariables, TData>;
  /** Invalidate these query keys on success */
  invalidateKeys?: string[][];
  /** Show success toast */
  showSuccessToast?: boolean;
  /** Show error toast */
  showErrorToast?: boolean;
  /** Custom success message */
  successMessage?: string;
  /** Custom error message */
  errorMessage?: string;
}

interface UseApiInfiniteQueryOptions<T> {
  /** Query key for caching */
  queryKey: string[];
  /** Query function with page param */
  queryFn: (pageParam: number) => Promise<T[]>;
  /** Items per page */
  pageSize?: number;
}

// ─── Extract data from ApiResponse ───────────────────────────

function extractData<T>(response: ApiResponse<T> | T): T {
  if (
    response &&
    typeof response === 'object' &&
    'success' in response &&
    'data' in response
  ) {
    return (response as ApiResponse<T>).data as T;
  }
  return response as T;
}

// ─── useApiQuery Hook ────────────────────────────────────────

/**
 * Wrapper around useQuery with GEM Z API conventions.
 *
 * @example
 * const { data, isLoading, error } = useApiQuery({
 *   queryKey: ['wallet'],
 *   queryFn: () => GemZApi.Finance.getWallet(),
 * });
 */
export function useApiQuery<T>({
  queryKey,
  queryFn,
  showErrorToast = true,
  errorMessage = 'Failed to load data',
  ...options
}: UseApiQueryOptions<T>) {
  const toast = useToast();

  return useQuery({
    queryKey,
    queryFn: async () => {
      try {
        const response = await queryFn();
        return extractData(response);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unknown error occurred';
        if (showErrorToast) {
          toast.error(errorMessage, { title: 'Error' });
        }
        throw new Error(message);
      }
    },
    ...options,
  });
}

// ─── useApiMutation Hook ─────────────────────────────────────

/**
 * Wrapper around useMutation with GEM Z API conventions.
 *
 * @example
 * const { mutate, isPending } = useApiMutation({
 *   mutationFn: (amount) => GemZApi.Finance.topup(amount),
 *   invalidateKeys: [['wallet'], ['transactions']],
 *   showSuccessToast: true,
 *   successMessage: 'Wallet topped up!',
 * });
 */
export function useApiMutation<TVariables = void, TData = unknown>({
  mutationFn,
  invalidateKeys,
  showSuccessToast = false,
  showErrorToast = true,
  successMessage = 'Operation completed successfully',
  errorMessage = 'Operation failed',
  ...options
}: UseApiMutationOptions<TVariables, TData>) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      try {
        const response = await mutationFn(variables);
        return extractData(response);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unknown error occurred';
        throw new Error(message);
      }
    },
    onSuccess: (data, variables, context) => {
      // Invalidate related queries
      if (invalidateKeys && invalidateKeys.length > 0) {
        invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }

      // Show success toast
      if (showSuccessToast) {
        toast.success(successMessage);
      }

      // Call user's onSuccess if provided
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      // Show error toast
      if (showErrorToast) {
        toast.error(error.message || errorMessage);
      }

      // Call user's onError if provided
      options.onError?.(error, variables, context);
    },
    ...options,
  });
}

// ─── useApiInfiniteQuery (for paginated data) ────────────────

/**
 * Infinite query hook for paginated data.
 *
 * @example
 * const { data, fetchNextPage, hasNextPage } = useApiInfiniteQuery({
 *   queryKey: ['feed'],
 *   queryFn: (page) => GemZApi.Social.getFeed(page),
 *   pageSize: 20,
 * });
 */
export function useApiInfiniteQuery<T>({
  queryKey,
  queryFn,
  pageSize = 20,
}: UseApiInfiniteQueryOptions<T>) {
  return useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const response = await queryFn(pageParam);
      return extractData(response as unknown as ApiResponse<T[]>);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: T[], allPages: T[][]) => {
      return lastPage.length === pageSize ? allPages.length + 1 : undefined;
    },
  });
}

// ─── useOptimisticMutation ───────────────────────────────────

/**
 * Mutation with optimistic updates.
 *
 * @example
 * const { mutate } = useOptimisticMutation({
 *   queryKey: ['todos'],
 *   mutationFn: (todo) => GemZApi.Todos.create(todo),
 *   updater: (old, newTodo) => [...old, newTodo],
 * });
 */
export function useOptimisticMutation<TVariables, TData, TQueryData>({
  queryKey,
  mutationFn,
  updater,
  ...options
}: Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'> & {
  queryKey: string[];
  mutationFn: MutationFn<TVariables, TData>;
  updater: (oldData: TQueryData | undefined, newVariables: TVariables) => TQueryData;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      try {
        const response = await mutationFn(variables);
        return extractData(response);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        throw new Error(message);
      }
    },
    onMutate: async (variables: TVariables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<TQueryData>(queryKey);

      // Optimistically update
      queryClient.setQueryData<TQueryData>(queryKey, (old) =>
        updater(old, variables)
      );

      return { previousData };
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error(error.message || 'Operation failed');
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey });
    },
    ...options,
  });
}

export default { useApiQuery, useApiMutation, useApiInfiniteQuery, useOptimisticMutation };
