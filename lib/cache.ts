const defaultGarbageCollectorInterval = 500;
const defaultCacheTime = 1000 * 60 * 5;
const defaultStaleTime = 0;
const defaultRefetchOnWindowFocus = false;
const defaultRefetchOnReconnect = false;
export const createCache = (options?: CreateCacheOptions) => {
  const newCache: Cache = {
    d: {},
    l: {},
    set<T>(key: string, values: Partial<QueryState<T>>, notify = true) {
      let state = this.d[key] ?? this.init(key);
      this.d[key] = {
        ...state,
        ...values,
      };
      let listeners = this.l[key];
      if (notify && listeners?.length) {
        try {
          listeners.forEach((listener) => listener());
        } catch (e) {}
      }
    },
    sub(key, listener) {
      let listeners = this.l[key] ?? [];
      this.l[key] = listeners;
      listeners.push(listener);
      return () => {
        this.l[key] = listeners.filter((l) => l !== listener);
      };
    },
    init<T>(key: string) {
      if (!this.d[key]) {
        this.d[key] = getDefaultQueryState(options ?? {});
      }
      return this.d[key] as QueryState<T>;
    },
    get<T>(key: string): QueryState<T> {
      const result = this.d[key] as QueryState<T>;
      if (result) {
        this.set(
          key,
          {
            lastAccessedAt: Date.now(),
          },
          false
        );
      }
      return result;
    },

    async fetch<T>(
      key: string,
      getter: () => Promise<T> | T,
      forced = false,
      setError = true
    ) {
      this.init(key);
      const queryState = this.get<T>(key) as QueryState<T>;
      if (queryState.isLoading && !forced) {
        return {};
      }
      if (
        queryState.lastFetchedAt &&
        queryState.staleTime + queryState.lastFetchedAt > Date.now() &&
        !forced
      ) {
        return {};
      }
      this.set(key, {
        isLoading: true,
        error: undefined,
      });
      try {
        const result = await getter();
        this.set(key, {
          data: result,
          isLoading: false,
          error: undefined,
          lastFetchedAt: Date.now(),
        });
        return { data: result };
      } catch (e) {
        if (setError) {
          this.set(key, {
            isLoading: false,
            error: e as Error,
          });
        }
        return { error: e };
      }
    },
    gInt: undefined,
    toggleGc(enabled: boolean) {
      if (enabled && !this.gInt) {
        this.gInt = setInterval(() => {
          const queryKeys = Object.keys(this.d);
          const now = Date.now();

          queryKeys.forEach((key) => {
            let data = this.d[key] as QueryState<any>;
            let listeners = this.l[key];
            if (Array.isArray(listeners) && listeners.length > 0) {
              return;
            }
            if (
              data.cacheTime &&
              data.lastAccessedAt &&
              now - data.lastAccessedAt > data.cacheTime
            ) {
              delete this.d[key];
              delete this.l[key];
            }
          });
        }, options?.garbageCollectorInterval ?? defaultGarbageCollectorInterval);
      }
      if (!enabled && this.gInt) {
        clearInterval(this.gInt);
        this.gInt = undefined;
      }
    },
  };

  newCache.toggleGc(true);
  return newCache;
};

function getDefaultQueryState(options: CreateCacheOptions) {
  return {
    data: undefined,
    isLoading: false,
    error: undefined,
    cacheTime: options.cacheTime ?? defaultCacheTime,
    staleTime: options.staleTime ?? defaultStaleTime,
    refetchOnWindowFocus:
      options.refetchOnWindowFocus ?? defaultRefetchOnWindowFocus,
    refetchOnReconnect: options.refetchOnReconnect ?? defaultRefetchOnReconnect,
  };
}
export const globalCache = createCache();

export type QueryState<T> = {
  data: T | undefined;
  isLoading: boolean;
  error: unknown | undefined;
  cacheTime: number;
  staleTime: number;
  lastAccessedAt?: number;
  lastFetchedAt?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
};
export type Cache = {
  d: {
    [key: string]: QueryState<any>;
  };
  l: {
    [key: string]: (() => void)[];
  };
  set: <T>(
    key: string,
    values: Partial<QueryState<T>>,
    notify?: boolean
  ) => void;
  sub: (key: string, listener: () => void) => () => void;
  init: <T>(key: string) => QueryState<T>;
  get: <T>(key: string) => QueryState<T> | undefined;
  fetch: <T>(
    key: string,
    getter: () => Promise<T> | T,
    forced: boolean,
    setError: boolean
  ) => Promise<{ error?: unknown; data?: T }>;
  gInt?: NodeJS.Timeout | undefined;
  toggleGc: (enabled: boolean) => void;
};

export type CreateCacheOptions = {
  staleTime?: number;
  cacheTime?: number;
  garbageCollectorInterval?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
};
