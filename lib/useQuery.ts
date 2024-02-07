import { useContext, useEffect, useRef, useState } from "react";
import { QueryState, Cache } from "./cache";
import { pickIfDefined } from "./utils";
import { CacheContext } from "./context";

export type UseQueryGetter<T> = () => Promise<T> | T;
export type UseQueryRefetchInterval<T> = number | ((latestData?: T) => number);
export type UseQueryParams<T> = {
  key: string;
  getter: UseQueryGetter<T>;
  refetchInterval?: UseQueryRefetchInterval<T>;
  cacheTime?: number;
  staleTime?: number;
};

export const useQuery = <T>(params: UseQueryParams<T>, forcedCache?: Cache) => {
  const contextCache = useContext(CacheContext);
  const cache = forcedCache || contextCache;
  const [queryState, setQueryState] = useState(
    cache.getQueryState(params.key) ?? cache.initQueryState(params.key)
  );
  const refetchTimer = useRef<NodeJS.Timeout>();
  const syncState = () => {
    setQueryState(cache.getQueryState(params.key) as QueryState<T>);
  };
  const fetchQuery = async (force: boolean) => {
    await cache.fetchQuery(params.key, params.getter, force);
    if (params.refetchInterval) {
      const interval =
        typeof params.refetchInterval === "number"
          ? params.refetchInterval
          : params.refetchInterval(cache.getQueryState<T>(params.key)?.data);
      if (interval > 0) {
        refetchTimer.current = setTimeout(() => fetchQuery(true), interval);
      }
    }
  };

  useEffect(() => {
    cache.setQueryState(
      params.key,
      pickIfDefined(params, ["cacheTime", "staleTime"]),
      false
    );
    const unsubscribe = cache.subscribe(params.key, syncState);
    fetchQuery(false).catch();
    return () => {
      clearTimeout(refetchTimer.current);
      unsubscribe();
    };
  }, [params.key]);

  return {
    ...queryState,
    refetch: () => fetchQuery(true),
  };
};
