import { useContext, useEffect, useRef, useState } from "react";
import { QueryState, Cache } from "./cache";
import { addWindowListener, pickIfDefined } from "./utils";
import { CacheContext } from "./context";

export type UseQueryGetter<T> = () => Promise<T> | T;
export type UseQueryRefetchInterval<T> = (
  latestData?: T
) => number | Promise<number>;
export type UseOptions<T> = {
  refetchInterval?: UseQueryRefetchInterval<T>;
  cacheTime?: number;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
  cache?: Cache;
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
  const fetchQuery = async (force: boolean) => {
    await cache.fetch(key, fetchFn, force);
    if (params?.refetchInterval) {
      const interval = await params.refetchInterval(cache.get<T>(key)?.data);
      if (interval > 0) {
        refetchTimer.current = setTimeout(() => fetchQuery(true), interval);
      }
    }
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
