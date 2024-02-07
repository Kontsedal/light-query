import { useContext, useEffect, useRef, useState } from "react";
import { QueryState, Cache } from "./cache";
import { addWindowListener, pickIfDefined } from "./utils";
import { CacheContext } from "./context";

export type UseQueryGetter<T> = () => Promise<T> | T;
export type UseQueryRefetchInterval<T> = number | ((latestData?: T) => number);
export type UseQueryParams<T> = {
  key: string;
  getter: UseQueryGetter<T>;
  refetchInterval?: UseQueryRefetchInterval<T>;
  cacheTime?: number;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
};

export const useQuery = <T>(params: UseQueryParams<T>, forcedCache?: Cache) => {
  const contextCache = useContext(CacheContext);
  const cache = forcedCache || contextCache;
  const [queryState, setQueryState] = useState(
    cache.get(params.key) ?? cache.init(params.key)
  );
  const refetchTimer = useRef<NodeJS.Timeout>();
  const syncState = () => {
    setQueryState(cache.get(params.key) as QueryState<T>);
  };
  const fetchQuery = async (force: boolean) => {
    await cache.fetch(params.key, params.getter, force);
    if (params.refetchInterval) {
      const interval =
        typeof params.refetchInterval === "number"
          ? params.refetchInterval
          : params.refetchInterval(cache.get<T>(params.key)?.data);
      if (interval > 0) {
        refetchTimer.current = setTimeout(() => fetchQuery(true), interval);
      }
    }
  };

  useEffect(() => {
    cache.set(
      params.key,
      pickIfDefined(params, ["cacheTime", "staleTime"]),
      false
    );
    const cleanups: (() => unknown)[] = [];
    const unsubscribe = cache.sub(params.key, syncState);
    let forcedRefetch = fetchQuery.bind(null, true);
    fetchQuery(false).catch();
    if (params.refetchOnWindowFocus || queryState.refetchOnWindowFocus) {
      cleanups.push(addWindowListener("focus", forcedRefetch));
    }
    if (params.refetchOnReconnect || queryState.refetchOnReconnect) {
      cleanups.push(addWindowListener("online", forcedRefetch));
    }
    return () => {
      clearTimeout(refetchTimer.current);
      unsubscribe();
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [params.key]);

  return {
    ...queryState,
    refetch: () => fetchQuery(true),
  };
};
