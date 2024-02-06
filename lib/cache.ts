const logPrefix = 'light-query:::';
const defaultGarbageCollectorInterval = 500;
const defaultCacheTime = 1000 * 60 * 5;
const defaultStaleTime = 0;
export type QueryState<T> = {
  data: T | undefined;
  isLoading: boolean;
  error: Error | undefined;
  cacheTime: number;
  staleTime: number;
  lastAccessedAt?: number;
  lastFetchedAt?: number;
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
  fetchQuery: <T>(key: string, getter: () => Promise<T> | T) => Promise<void>;
  garbageCollectorInterval?: number | undefined;
  toggleGarbageCollector: (enabled: boolean) => void;
};
export const createCache = (options?: {
  staleTime?: number;
  cacheTime?: number;
  garbageCollectorInterval?: number;
}) => {
  const newCache: Cache = {
    data: {},
    listeners: {},
    setQueryParams(key: string, values, notify = true) {
      if (!this.data[key]) {
        this.data[key] = {
          data: undefined,
          isLoading: false,
          error: undefined,
          cacheTime: options?.cacheTime ?? defaultCacheTime,
          staleTime: options?.staleTime ?? defaultStaleTime,
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
          cacheTime: options?.cacheTime ?? defaultCacheTime,
          staleTime: options?.staleTime ?? defaultStaleTime,
        };
      }
    },
    getQueryParams<T>(key: string): QueryState<T> {
      const result = this.data[key] as QueryState<T>;
      if (result) {
        this.setQueryParams(
          key,
          {
            lastAccessedAt: Date.now(),
          },
          false
        );
      }
      return result;
    },

    async fetchQuery<T>(key: string, getter: () => Promise<T> | T) {
      this.initQueryParams(key);
      const queryState = this.getQueryParams<T>(key);
      if (!queryState || queryState.isLoading) {
        return;
      }
      if (
        queryState.lastFetchedAt &&
        queryState.staleTime + queryState.lastFetchedAt > Date.now()
      ) {
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
          lastFetchedAt: Date.now(),
        });
      } catch (e) {
        this.setQueryParams(key, {
          isLoading: false,
          error: e as Error,
        });
      }
    },
    garbageCollectorInterval: undefined,
    toggleGarbageCollector(enabled: boolean) {
      if (enabled && !this.garbageCollectorInterval) {
        this.garbageCollectorInterval = setInterval(() => {
          const listenerKeys = Object.keys(this.listeners);
          const now = Date.now();

          listenerKeys.forEach((key) => {
            let data = this.data[key];
            if (!data) {
              return;
            }
            if (this.listeners[key].length > 0) {
              return;
            }
            if (
              data.cacheTime &&
              data.lastAccessedAt &&
              now - data.lastAccessedAt > data.cacheTime
            ) {
              delete this.data[key];
            }
          });
        }, options?.garbageCollectorInterval ?? defaultGarbageCollectorInterval);
      }
      if (!enabled && this.garbageCollectorInterval) {
        clearInterval(this.garbageCollectorInterval);
        this.garbageCollectorInterval = undefined;
      }
    },
  };

  newCache.toggleGarbageCollector(true);
  return newCache;
};
export const globalCache: Cache = createCache();
