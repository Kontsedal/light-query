import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { QueryState, Cache } from "./cache";
import {
  addWindowListener,
  isFunction,
  isUndefined,
  pickIfDefined,
} from "./utils";
import { CacheContext } from "./context";

export const useQuery = <T>(
  key: string,
  fetchFn: UseQueryGetter<T>,
  params?: UseOptions<T>
) => {
  const contextCache = useContext(CacheContext);
  const cache = params?.cache || contextCache;
  const [queryState, setQueryState] = useState(
    cache.get(key) ?? cache.init(key)
  );
  const refetchTimer = useRef<NodeJS.Timeout>();
  const mounted = useRef(true);
  const syncState = () => {
    setQueryState(cache.get(key) as QueryState<T>);
  };
  const retryFetch = async (error: unknown, retryFn: RetryFn<T>) => {
    let latestError = error;
    let attempt = 0;
    let retryInterval = 0;
    do {
      if (!mounted.current) {
        return;
      }
      attempt++;
      retryInterval = await retryFn(attempt, error, cache.get<T>(key));
      if (retryInterval > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryInterval));
        const result = await cache.fetch(key, fetchFn, true, false);
        latestError = result.error;
      } else {
        cache.set(
          key,
          { error: latestError, isLoading: false, data: undefined },
          true
        );
      }
    } while (retryInterval > 0);
  };
  const fetchQuery = async (force: boolean) => {
    let result = await cache.fetch<T>(key, fetchFn, force, !params?.retry);
    if (!isUndefined(result?.error) && params?.retry) {
      await retryFetch(result.error, params.retry);
    }
    if (params?.refetchInterval) {
      clearTimeout(refetchTimer.current);
      const interval = await params.refetchInterval(cache.get<T>(key)?.data);
      if (interval > 0) {
        refetchTimer.current = setTimeout(() => fetchQuery(true), interval);
      }
    }
    return result;
  };

  useEffect(() => {
    mounted.current = true;
    cache.set(
      key,
      pickIfDefined(params || {}, ["cacheTime", "staleTime"]),
      false
    );
    let forcedRefetch = fetchQuery.bind(null, true);
    const cleanups: ((() => unknown) | boolean | undefined)[] = [
      (params?.refetchOnWindowFocus ?? queryState.refetchOnWindowFocus) &&
        addWindowListener("focus", forcedRefetch),
      (params?.refetchOnReconnect ?? queryState.refetchOnReconnect) &&
        addWindowListener("online", forcedRefetch),
    ];
    const unsubscribe = cache.sub(key, syncState);
    fetchQuery(false).catch();
    return () => {
      clearTimeout(refetchTimer.current);
      unsubscribe();
      cleanups.filter(isFunction).forEach((cleanup) => cleanup());
      mounted.current = false;
    };
  }, [key]);

  return useMemo(
    () => ({
      data: queryState.data,
      error: queryState.error,
      isLoading: queryState.isLoading,
      refetch: () => fetchQuery(true),
    }),
    [queryState.data, queryState.error, queryState.isLoading]
  );
};

export type UseQueryGetter<T> = () => Promise<T> | T;
export type UseQueryRefetchInterval<T> = (
  latestData?: T
) => number | Promise<number>;
export type RetryFn<T> = (
  attempt: number,
  error: unknown,
  latestData?: QueryState<T>
) => number | Promise<number>;
export type UseOptions<T> = {
  refetchInterval?: UseQueryRefetchInterval<T>;
  cacheTime?: number;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
  cache?: Cache;
  retry?: RetryFn<T>;
};
