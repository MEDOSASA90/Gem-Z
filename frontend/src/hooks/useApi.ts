'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * GEM Z — Generic API Data Fetching Hook
 *
 * Usage:
 *   const { data, loading, error, refetch } = useApi(() => GemZApi.Trainee.getDashboard());
 *
 * @template T  The expected shape of `data` returned by the API
 */
export function useApi<T = any>(
    fetcher: () => Promise<any>,
    options: {
        immediate?: boolean;  // auto-fetch on mount (default: true)
        deps?: any[];         // re-fetch when these change
    } = {}
) {
    const { immediate = true, deps = [] } = options;

    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(immediate);
    const [error, setError] = useState<string | null>(null);

    // Keep a stable ref to the fetcher so we don't re-create effects on every render
    const fetcherRef = useRef(fetcher);
    fetcherRef.current = fetcher;

    const fetch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetcherRef.current();
            // Handle both { success, data } shaped and flat responses
            setData(result?.data ?? result);
        } catch (err: any) {
            setError(err?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (immediate) fetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [immediate, ...deps]);

    return { data, loading, error, refetch: fetch };
}

/**
 * GEM Z — Mutation Hook
 *
 * For POST/PUT/DELETE operations that aren't fetched on mount.
 *
 * Usage:
 *   const { mutate, loading, error } = useMutation((data) => GemZApi.Auth.login(data));
 *   await mutate({ email, password });
 */
export function useMutation<TInput = any, TOutput = any>(
    mutator: (input: TInput) => Promise<TOutput>
) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<TOutput | null>(null);

    const mutate = useCallback(async (input: TInput): Promise<TOutput | null> => {
        setLoading(true);
        setError(null);
        try {
            const result = await mutator(input);
            setData(result);
            return result;
        } catch (err: any) {
            setError(err?.message || 'Operation failed');
            return null;
        } finally {
            setLoading(false);
        }
    }, [mutator]);

    return { mutate, loading, error, data };
}
