const defaultGarbageCollectorInterval = 500;
const defaultCacheTime = 1000 * 60 * 5;
const defaultStaleTime = 0;

export type QueryState<T> = {
  data: T | undefined;
  isLoading: boolean;
  error: unknown | undefined;
  cacheTime: number;
  staleTime: number;
  lastAccessedAt?: number;
  lastFetchedAt?: number;
};
export type Cache = {
  data: {
    [key: string]: QueryState<any>;
  };
  listeners: {
    [key: string]: (() => void)[];
  };
  setQueryState: <T>(
    key: string,
    values: Partial<QueryState<T>>,
    notify?: boolean
  ) => void;
  subscribe: (key: string, listener: () => void) => () => void;
  initQueryState: <T>(key: string) => QueryState<T>;
  getQueryState: <T>(key: string) => QueryState<T> | undefined;
  fetchQuery: <T>(key: string, getter: () => Promise<T> | T) => Promise<void>;
  garbageCollectorInterval?: NodeJS.Timeout | undefined;
  toggleGarbageCollector: (enabled: boolean) => void;
};

export type CreateCacheOptions = {
  staleTime?: number;
  cacheTime?: number;
  garbageCollectorInterval?: number;
};
export const createCache = (options?: CreateCacheOptions) => {
  const newCache: Cache = {
    data: {},
    listeners: {},
    setQueryState<T>(
      key: string,
      values: Partial<QueryState<T>>,
      notify = true
    ) {
      let state = this.data[key];
      if (!state) {
        state = this.initQueryState(key);
      }
      this.data[key] = {
        ...state,
        ...values,
      };
      let listeners = this.listeners[key];
      if (notify && Array.isArray(listeners)) {
        try {
          listeners.forEach((listener) => listener());
        } catch (e) {}
      }
    },
    subscribe(key, listener) {
      let listeners = this.listeners[key];
      if (!listeners) {
        listeners = [];
        this.listeners[key] = listeners;
      }
      listeners.push(listener);
      return () => {
        let listeners = this.listeners[key];
        if (!Array.isArray(listeners)) {
          return;
        }
        this.listeners[key] = listeners.filter((l) => l !== listener);
      };
    },
    initQueryState<T>(key: string) {
      if (!this.data[key]) {
        this.data[key] = getDefaultQueryState(options ?? {});
      }
      return this.data[key] as QueryState<T>;
    },
    getQueryState<T>(key: string): QueryState<T> {
      const result = this.data[key] as QueryState<T>;
      if (result) {
        this.setQueryState(
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
      this.initQueryState(key);
      const queryState = this.getQueryState<T>(key);
      if (!queryState || queryState.isLoading) {
        return;
      }
      if (
        queryState.lastFetchedAt &&
        queryState.staleTime + queryState.lastFetchedAt > Date.now()
      ) {
        return;
      }
      this.setQueryState(key, {
        isLoading: true,
        error: undefined,
      });
      try {
        const result = await getter();
        this.setQueryState(key, {
          data: result,
          isLoading: false,
          error: undefined,
          lastFetchedAt: Date.now(),
        });
      } catch (e) {
        this.setQueryState(key, {
          isLoading: false,
          error: e as Error,
        });
      }
    },
    garbageCollectorInterval: undefined,
    toggleGarbageCollector(enabled: boolean) {
      if (enabled && !this.garbageCollectorInterval) {
        this.garbageCollectorInterval = setInterval(() => {
          const queryKeys = Object.keys(this.data);
          const now = Date.now();

          queryKeys.forEach((key) => {
            let data = this.data[key] as QueryState<any>;
            let listeners = this.listeners[key];
            if (Array.isArray(listeners) && listeners.length > 0) {
              return;
            }
            if (
              data.cacheTime &&
              data.lastAccessedAt &&
              now - data.lastAccessedAt > data.cacheTime
            ) {
              delete this.data[key];
              delete this.listeners[key];
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

function getDefaultQueryState(options: CreateCacheOptions) {
  return {
    data: undefined,
    isLoading: false,
    error: undefined,
    cacheTime: options.cacheTime ?? defaultCacheTime,
    staleTime: options.staleTime ?? defaultStaleTime,
  };
}
export const globalCache: Cache = createCache();
