import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const logPrefix = 'light-query:::';

export type UseQueryGetter<T> = () => Promise<T> | T;
export type UseQueryRefetchInterval <T>= number | ((latestData: T | undefined) => number);
export type UseQueryParams<T> = {
  key: string;
  getter: UseQueryGetter<T>;
  refetchInterval?: UseQueryRefetchInterval<T>;
};

export type QueryState<T> = {
  data: T | undefined;
  isLoading: boolean;
  error: Error | undefined;
};

export type Cache = {
  data: {
    [key: string]: QueryState<unknown>;
  };
  listeners: {
    [key: string]: (() => void)[];
  };
  setQueryParams: <T>(
    key: string,
    values: Partial<QueryState<T>>,
    notify?: boolean
  ) => void;
  subscribe: <T>(key: string, listener: () => void) => () => void;
  initQueryParams: <T>(key: string) => void;
  getQueryParams: <T>(key: string) => QueryState<T> | undefined;
  fetchQuery: <T>(key: string, getter: () => Promise<T> | T) => Promise<void>
};

export const createCache = (): Cache => ({
  data: {},
  listeners: {},
  setQueryParams(key: string, values, notify = true) {
    if (!this.data[key]) {
      this.data[key] = {
        data: undefined,
        isLoading: false,
        error: undefined,
      };
    }
    this.data[key] = {
      ...this.data[key],
      ...values,
    };
    if (notify && this.listeners[key]) {
      try {
        this.listeners[key].forEach((listener) => listener());
      } catch (e) {
        console.error(logPrefix, 'Error in listener', e);
      }
    }
  },
  subscribe(key, listener) {
    if (!this.listeners[key]) {
      this.listeners[key] = [];
    }
    this.listeners[key].push(listener);
    return () => {
      this.listeners[key] = this.listeners[key].filter((l) => l !== listener);
    };
  },
  initQueryParams<T>(key: string) {
    if (!this.data[key]) {
      this.data[key] = {
        data: undefined,
        isLoading: false,
        error: undefined,
      };
    }
  },
  getQueryParams<T>(key: string): QueryState<T> {
    return this.data[key] as QueryState<T>;
  },

  async fetchQuery<T>(key: string, getter: () => Promise<T> | T) {
    this.initQueryParams(key);
    const queryState = this.getQueryParams<T>(key);
    if (!queryState || queryState.isLoading) {
      return;
    }
    this.setQueryParams(key, {
      isLoading: true,
      error: undefined,
    });
    try {
      const result = await getter();
      this.setQueryParams(key, {
        data: result,
        isLoading: false,
        error: undefined,
      });
    } catch (e) {
      this.setQueryParams(key, {
        isLoading: false,
        error: e as Error,
      });
    }
  }
})
export const globalCache: Cache = createCache();
export const useQuery = <T>(params: UseQueryParams<T>, cache = globalCache) => {
  const initialQueryState = useRef(cache.getQueryParams<T>(params.key))
  const [data, setData] = useState<T | undefined>(initialQueryState.current?.data);
  const [isLoading, setIsLoading] = useState(initialQueryState.current?.isLoading ?? false);
  const [error, setError] = useState<unknown | undefined>(initialQueryState.current?.error ?? undefined);
  const syncQueryState = useCallback((key: string) => {
    const queryState =  cache.getQueryParams<T>(key);
    if(!queryState) {
      return;
    }
    const { data, isLoading, error } = queryState;
    setData(data);
    setIsLoading(isLoading);
    setError(error);
  }, [])
  const refetchTimer = useRef<number | undefined>(undefined);
  const fetchQuery = useCallback(async (key: string, getter: UseQueryGetter<T>, refetchInterval?: UseQueryRefetchInterval<T>) => {
    await cache.fetchQuery(params.key, params.getter);
    const queryState =  cache.getQueryParams<T>(key);
    if(!queryState) {
      return;
    }
    const { data } = queryState;
    if(refetchInterval) {
      const interval = typeof refetchInterval === "number" ? refetchInterval : refetchInterval(data);
      refetchTimer.current = setTimeout(() => {
        fetchQuery(key, getter, refetchInterval);
      }, interval)
    }
  }, [params.key, params.getter, params.refetchInterval]);
  useEffect(() => {
    cache.initQueryParams(params.key);
    syncQueryState(params.key);
    const unsubscribe = cache.subscribe(params.key, () => {
      syncQueryState(params.key);
    });
    return () => {
      if(refetchTimer.current) {
        clearTimeout(refetchTimer.current);
      }
      unsubscribe();
    }
  }, [params.key]);
  return useMemo(
    () => ({
      data,
      isLoading,
      error,
      refetch: () => fetchQuery(params.key, params.getter, params.refetchInterval),
    }),
    [data, isLoading, error, params.key]
  );
};
