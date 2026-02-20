import { useContext, useEffect, useMemo, useRef, useState } from "react";
import type { QueryState, Cache } from "./cache";
import {
  addWindowListener,
  isFunction,
  isUndefined,
  pickIfDefined,
  useValueRef,
  wait,
} from "./utils";
import { CacheContext } from "./context";

export const useQuery = <T>(
  key: string,
  fetchFn: UseQueryGetter<T>,
  params?: UseQueryOptions<T>,
) => {
  const [_, setTime] = useState(0);
  const contextCache = useContext(CacheContext);
  const cache = params?.cache || contextCache;
  const queryState = cache.init<T>(key);
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const fetchFnRef = useValueRef(fetchFn);
  const refetchIntervalRef = useValueRef(params?.refetchInterval);
  const retryFnRef = useValueRef<RetryFn<T> | undefined>(params?.retry);
  const onSuccessRef = useValueRef(params?.onSuccess);
  const onErrorRef = useValueRef(params?.onError);
  const retryFetch = async (error: unknown) => {
    if (!retryFnRef.current) {
      return;
    }
    let latestError = error;
    let attempt = 0;
    let retryInterval = 0;
    do {
      if (!mounted.current) {
        return;
      }
      attempt++;
      retryInterval = await retryFnRef.current(
        attempt,
        error,
        cache.get<T>(key),
      );
      if (retryInterval > 0) {
        await wait(retryInterval);
        const result = await cache.fetch(key, fetchFnRef.current, true, false);
        if (isUndefined(result.error)) {
          return;
        }
        latestError = result.error ?? latestError;
      } else {
        cache.set(key, { error: latestError, isLoading: false }, true);
      }
    } while (retryInterval > 0);
  };
  const fetchQuery = async (force: boolean) => {
    const result = await cache.fetch<T>(
      key,
      fetchFnRef.current,
      force,
      !params?.retry,
    );
    if (!isUndefined(result?.error) && params?.retry) {
      await retryFetch(result.error);
      const finalState = cache.get<T>(key);
      if (finalState && !finalState.error && finalState.data !== undefined) {
        onSuccessRef.current?.(finalState.data);
      } else if (finalState?.error) {
        onErrorRef.current?.(finalState.error);
      }
    } else if (result?.data !== undefined) {
      onSuccessRef.current?.(result.data);
    } else if (!isUndefined(result?.error)) {
      onErrorRef.current?.(result.error);
    }
    if (!mounted.current) {
      return result;
    }
    if (refetchIntervalRef.current) {
      refetchTimer.current && clearTimeout(refetchTimer.current);
      const interval = await refetchIntervalRef.current(
        cache.get<T>(key)?.data,
      );
      if (interval > 0 && mounted.current) {
        refetchTimer.current = setTimeout(() => fetchQuery(true), interval);
      }
    }
    return result;
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetchQuery and cache methods are intentionally excluded; fetchQuery is recreated each render but uses stable refs, and params is excluded to avoid re-running the effect on every render
  useEffect(() => {
    const enabled =
      typeof params?.enabled === "boolean" ? params.enabled : true;
    if (!enabled) {
      return;
    }
    mounted.current = true;
    const unsubscribe = cache.sub(key, () => setTime(Date.now()));
    cache.set(
      key,
      pickIfDefined(params || {}, ["cacheTime", "staleTime"]),
      false,
    );
    if (
      params?.initialData !== undefined &&
      !cache.get<T>(key)?.lastFetchedAt
    ) {
      cache.set(key, { data: params.initialData }, false);
    }
    const forcedRefetch = fetchQuery.bind(null, true);
    const cleanups: ((() => unknown) | boolean | undefined)[] = [
      (params?.refetchOnWindowFocus ?? queryState.refetchOnWindowFocus) &&
        addWindowListener("focus", forcedRefetch),
      (params?.refetchOnReconnect ?? queryState.refetchOnReconnect) &&
        addWindowListener("online", forcedRefetch),
    ];
    fetchQuery(false).catch(console.error);
    return () => {
      refetchTimer.current && clearTimeout(refetchTimer.current);
      unsubscribe();
      cleanups.filter(isFunction).forEach((cleanup) => {
        cleanup();
      });
      mounted.current = false;
    };
  }, [key, params?.enabled]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: cache and fetchQuery are intentionally excluded; cache is stable from context and fetchQuery uses stable refs
  return useMemo(
    () => ({
      data: queryState.data,
      error: queryState.error,
      isLoading: queryState.isLoading,
      isIdle: !queryState.isLoading && !queryState.lastFetchedAt,
      isUpdating: queryState.isLoading && !!queryState.lastFetchedAt,
      isSuccess:
        !queryState.isLoading && !!queryState.data && !queryState.error,
      isError: !queryState.isLoading && !!queryState.error,
      isFetched: !!queryState.lastFetchedAt,
      lastFetchedAt: queryState.lastFetchedAt,
      getData: () => cache.get<T>(key)?.data,
      setData: (updater: T | ((prev?: T) => T)) => {
        const newData =
          typeof updater === "function"
            ? (updater as (prev?: T) => T)(cache.get<T>(key)?.data)
            : updater;
        cache.set(key, { data: newData });
      },
      refetch: () => fetchQuery(true),
      reset: () =>
        cache.set(key, {
          data: undefined,
          error: undefined,
          isLoading: false,
          lastFetchedAt: undefined,
        }),
    }),
    [
      queryState.data,
      queryState.error,
      queryState.isLoading,
      queryState.lastFetchedAt,
      key,
    ],
  );
};

export type UseQueryGetter<T> = () => Promise<T> | T;
export type UseQueryRefetchInterval<T> = (
  latestData?: T,
) => number | Promise<number>;
export type RetryFn<T> = (
  attempt: number,
  error: unknown,
  latestData?: QueryState<T>,
) => number | Promise<number>;
export type UseQueryOptions<T> = {
  refetchInterval?: UseQueryRefetchInterval<T>;
  cacheTime?: number;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
  cache?: Cache;
  retry?: RetryFn<T>;
  enabled?: boolean;
  initialData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: unknown) => void;
};
