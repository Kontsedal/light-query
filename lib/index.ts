import { useEffect, useMemo, useState } from 'react';

const logPrefix = 'light-query:::';

export type UseQueryParams<T> = {
  key: (string | number)[];
  getter: () => Promise<T> | T;
  cacheTime?: number;
};

export type QueryState<T> = {
  data: T | undefined;
  isLoading: boolean;
  error: Error | undefined;
  cacheTime?: number;
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
  getQueryParams: <T>(key: string) => QueryState<T>;
};
export const cache: Cache = {
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
        cacheTime: Infinity,
      };
    }
  },
  getQueryParams<T>(key: string): QueryState<T> {
    return this.data[key] as QueryState<T>;
  },
};
export const useQuery = <E, T>(params: UseQueryParams<T>) => {
  const queryKey = serializeKey(params.key);
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown | undefined>(undefined);
  useEffect(() => {
    cache.initQueryParams(queryKey);
    return cache.subscribe(queryKey, () => {
      const { data, isLoading, error } = cache.getQueryParams<T>(queryKey);
      setData(data);
      setIsLoading(isLoading);
      setError(error);
    });
  }, []);
  useEffect(() => {
    cache.setQueryParams(
      queryKey,
      {
        isLoading: true,
        error: undefined,
      },
      true
    );

    (async () => {
      try {
        const result = await params.getter();
        cache.setQueryParams(queryKey, {
          data: result,
          isLoading: false,
          error: undefined,
        });
      } catch (e) {
        cache.setQueryParams(queryKey, {
          isLoading: false,
          error: e as Error,
        });
      }
    })();
  }, []);
  return useMemo(
    () => ({
      data,
      isLoading,
      error,
    }),
    [data, isLoading, error, params]
  );
};

function serializeKey(key: (string | number)[]) {
  return key.join('-');
}
