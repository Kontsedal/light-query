import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { globalCache, QueryState } from './cache';

export type UseQueryGetter<T> = () => Promise<T> | T;
export type UseQueryRefetchInterval<T> =
  | number
  | ((latestData: T | undefined) => number);
export type UseQueryParams<T> = {
  key: string;
  getter: UseQueryGetter<T>;
  refetchInterval?: UseQueryRefetchInterval<T>;
  cacheTime?: number;
  staleTime?: number;
};

export const useQuery = <T>(params: UseQueryParams<T>, cache = globalCache) => {
  const initialQueryState = useRef(cache.getQueryParams<T>(params.key));
  const [data, setData] = useState<T | undefined>(
    initialQueryState.current?.data
  );
  const [isLoading, setIsLoading] = useState(
    initialQueryState.current?.isLoading ?? false
  );
  const [error, setError] = useState<unknown | undefined>(
    initialQueryState.current?.error ?? undefined
  );
  const syncQueryState = useCallback((key: string) => {
    const queryState = cache.getQueryParams<T>(key);
    if (!queryState) {
      return;
    }
    const { data, isLoading, error } = queryState;
    setData(data);
    setIsLoading(isLoading);
    setError(error);
  }, []);
  const refetchTimer = useRef<number | undefined>(undefined);
  const fetchQuery = useCallback(
    async (
      key: string,
      getter: UseQueryGetter<T>,
      refetchInterval?: UseQueryRefetchInterval<T>
    ) => {
      await cache.fetchQuery(key, getter);
      const queryState = cache.getQueryParams<T>(key);
      if (!queryState) {
        return;
      }
      const { data } = queryState;
      if (refetchInterval) {
        const interval =
          typeof refetchInterval === 'number'
            ? refetchInterval
            : refetchInterval(data);
        refetchTimer.current = setTimeout(() => {
          fetchQuery(key, getter, refetchInterval);
        }, interval);
      }
    },
    [params.key, params.getter, params.refetchInterval]
  );
  useEffect(() => {
    const queryParams: Partial<QueryState<T>> = {};
    if (params.cacheTime) {
      queryParams.cacheTime = params.cacheTime;
    }
    if (params.staleTime) {
      queryParams.staleTime = params.staleTime;
    }
    cache.initQueryParams(params.key);
    if (Object.keys(queryParams).length > 0) {
      cache.setQueryParams(params.key, queryParams, false);
    }
    syncQueryState(params.key);
    const unsubscribe = cache.subscribe(params.key, () => {
      syncQueryState(params.key);
    });
    return () => {
      if (refetchTimer.current) {
        clearTimeout(refetchTimer.current);
      }
      unsubscribe();
    };
  }, [params.key]);
  return useMemo(
    () => ({
      data,
      isLoading,
      error,
      refetch: () =>
        fetchQuery(params.key, params.getter, params.refetchInterval),
    }),
    [data, isLoading, error, params.key]
  );
};
