import { useContext, useEffect, useRef, useState } from "react";
import { QueryState, Cache } from "./cache";
import { addWindowListener, isUndefined, pickIfDefined } from "./utils";
import { CacheContext } from "./context";

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
  const syncState = () => {
    setQueryState(cache.get(key) as QueryState<T>);
  };
  const retryFetch = async (error: unknown, retryFn: RetryFn<T>) => {
    let latestError = error;
    let attempt = 0;
    let retryInterval = 0;
    do {
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
    cache.set(
      key,
      pickIfDefined(params || {}, ["cacheTime", "staleTime"]),
      false
    );
    const cleanups: (() => unknown)[] = [];
    const unsubscribe = cache.sub(key, syncState);
    let forcedRefetch = fetchQuery.bind(null, true);
    fetchQuery(false).catch();
    if (params?.refetchOnWindowFocus ?? queryState.refetchOnWindowFocus) {
      cleanups.push(addWindowListener("focus", forcedRefetch));
    }
    if (params?.refetchOnReconnect ?? queryState.refetchOnReconnect) {
      cleanups.push(addWindowListener("online", forcedRefetch));
    }
    return () => {
      clearTimeout(refetchTimer.current);
      unsubscribe();
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [key]);

  return {
    ...queryState,
    refetch: () => fetchQuery(true),
  };
};
