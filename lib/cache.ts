/**
 * Default values for various cache parameters
 */
const defaultGarbageCollectorInterval = 500;
const defaultCacheTime = 1000 * 60 * 5;
const defaultStaleTime = 0;
const defaultRefetchOnWindowFocus = false;
const defaultRefetchOnReconnect = false;

/**
 * Function to create a new cache
 * @param {CreateCacheOptions} options - The options for creating the cache
 * @returns {Cache} The new cache
 */
export const createCache = (options?: CreateCacheOptions) => {
  /**
   * The new cache object
   * @type {Cache}
   */
  const newCache: Cache = {
    d: {}, // Data storage for the cache
    l: {}, // Listener storage for the cache
    set<T>(key: string, values: Partial<QueryState<T>>, notify = true) {
      // Get the current state for the key, or initialize a new one
      let state = this.d[key] ?? this.init(key);
      // Update the state with the new values
      this.d[key] = {
        ...state,
        ...values,
      };
      // Notify any listeners of the change
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
      // Return a function to unsubscribe the listener
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
      // Initialize the key if necessary
      this.init(key);
      const queryState = this.get<T>(key) as QueryState<T>;
      // If the key is already loading and we're not forcing a fetch, return early
      if (queryState.isLoading && !forced) {
        return {};
      }
      // If the key is not stale and we're not forcing a fetch, return early
      if (
        queryState.lastFetchedAt &&
        queryState.staleTime + queryState.lastFetchedAt > Date.now() &&
        !forced
      ) {
        return {};
      }
      // Set the key to loading state
      this.set(key, {
        isLoading: true,
        error: undefined,
      });
      try {
        // Try to fetch the data
        const result = await getter();
        // If successful, update the key with the new data
        this.set(key, {
          data: result,
          isLoading: false,
          error: undefined,
          lastFetchedAt: Date.now(),
        });
        return { data: result };
      } catch (e) {
        // If an error occurred, set the error state
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
        // If enabling and the garbage collector is not already running, start it
        this.gInt = setInterval(() => {
          const queryKeys = Object.keys(this.d);
          const now = Date.now();

          // For each key in the cache
          queryKeys.forEach((key) => {
            let data = this.d[key] as QueryState<any>;
            let listeners = this.l[key];
            // If there are listeners, don't remove the key
            if (Array.isArray(listeners) && listeners.length > 0) {
              return;
            }
            // If the key is expired, remove it
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
        // If disabling and the garbage collector is running, stop it
        clearInterval(this.gInt);
        this.gInt = undefined;
      }
    },
  };

  // Start the garbage collector
  newCache.toggleGc(true);
  return newCache;
};

/**
 * Function to get the default state for a key
 * @param {CreateCacheOptions} options - The options for creating the cache
 * @returns {QueryState} The default state for a key
 */
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
  /**
   * Method to set a value in the cache
   * @param {string} key - The key to set
   * @param {Partial<QueryState<T>>} values - The values to set
   * @param {boolean} [notify=true] - Whether to notify listeners of the change
   * @template T
   */
  set: <T>(
    key: string,
    values: Partial<QueryState<T>>,
    notify?: boolean
  ) => void;
  /**
   * Method to subscribe a listener to a key
   * @param {string} key - The key to subscribe to
   * @param {() => void} listener - The listener to subscribe
   * @returns {() => void} A function to unsubscribe the listener
   */
  sub: (key: string, listener: () => void) => () => void;
  /**
   * Method to initialize a new key in the cache
   * @param {string} key - The key to initialize
   * @returns {QueryState<T>} The initial state for the key
   * @template T
   */
  init: <T>(key: string) => QueryState<T>;
  /**
   * Method to get a value from the cache
   * @param {string} key - The key to get
   * @returns {QueryState<T>} The value for the key
   * @template T
   */
  get: <T>(key: string) => QueryState<T> | undefined;
  /**
   * Method to fetch a query data, potentially from a remote source
   * @param {string} key - The key to fetch
   * @param {() => Promise<T> | T} getter - The function to get the value
   * @param {boolean} [forced=false] - Whether to force the fetch
   * @param {boolean} [setError=true] - Whether to set the error state if an error occurs
   * @returns {Promise<{ error?: unknown; data?: T }>} The fetched value
   * @template T
   */
  fetch: <T>(
    key: string,
    getter: () => Promise<T> | T,
    forced: boolean,
    setError: boolean
  ) => Promise<{ error?: unknown; data?: T }>;
  /**
   * The garbage collector interval
   * @type {NodeJS.Timeout | undefined}
   */
  gInt?: NodeJS.Timeout | undefined;
  /**
   * Method to toggle the garbage collector
   * @param {boolean} enabled - Whether to enable the garbage collector
   */
  toggleGc: (enabled: boolean) => void;
};

export type CreateCacheOptions = {
  // How long we should not refetch a key after it's been fetched
  staleTime?: number;
  // The time to keep a key in the cache after no longer being accessed
  cacheTime?: number;
  // The interval to run the garbage collector
  garbageCollectorInterval?: number;
  // Whether to refetch a key when the window regains focus
  refetchOnWindowFocus?: boolean;
  // Whether to refetch a key when user reconnects to the internet
  refetchOnReconnect?: boolean;
};
