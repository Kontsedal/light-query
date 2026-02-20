import { vi } from "vitest";
import { createCache } from "../lib";
import { faker } from "@faker-js/faker";
import { wait } from "./utils";

describe("cache", () => {
  let queryKey: string = "";
  let queryData: { username: string } = { username: "" };

  beforeEach(() => {
    queryKey = faker.string.nanoid();
    queryData = {
      username: faker.internet.userName(),
    };
  });
  describe("createCache", () => {
    it("should build cache without errors", async () => {
      expect(async () => {
        createCache();
      }).not.toThrow();
    });
  });

  describe("initQueryState", () => {
    it("should initialize cache with default values", () => {
      const cache = createCache({
        cacheTime: 300000,
        staleTime: 30000,
      });
      cache.init(queryKey);
      expect(cache.d[queryKey]).toEqual({
        data: undefined,
        isLoading: false,
        error: undefined,
        cacheTime: 300000,
        staleTime: 30000,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
        lastAccessedAt: expect.any(Number),
      });
    });
  });

  describe("getQueryState", () => {
    it("should return query state", () => {
      const cache = createCache();
      cache.set(queryKey, { data: queryData });
      expect(cache.get(queryKey)).toEqual({
        data: queryData,
        isLoading: false,
        error: undefined,
        cacheTime: 5 * 60 * 1000,
        staleTime: 0,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
      });
    });

    it("should return undefined if query doesn't exist", () => {
      const cache = createCache();
      expect(cache.get(queryKey)).toBeUndefined();
    });
  });

  describe("setQueryParams", () => {
    it("should set custom params on set", () => {
      const cache = createCache();
      cache.set(queryKey, {
        data: queryData,
        cacheTime: 1000,
        staleTime: 1000,
      });
      expect(cache.d[queryKey]).toEqual({
        data: queryData,
        isLoading: false,
        error: undefined,
        cacheTime: 1000,
        staleTime: 1000,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
      });
    });
    it("should set default params on set if it didn't exist", () => {
      const cache = createCache();
      cache.set(queryKey, { data: queryData });
      expect(cache.d[queryKey]).toMatchObject({
        data: queryData,
        isLoading: false,
        error: undefined,
        cacheTime: 5 * 60 * 1000,
        staleTime: 0,
      });
    });
  });

  describe("fetchQuery", () => {
    it("should fetch query without errors", async () => {
      const cache = createCache();
      expect(async () => {
        await cache.fetch(queryKey, () => queryData, false, true);
      }).not.toThrow();
    });

    it("should set query state to loading before fetching", async () => {
      const cache = createCache();
      cache.fetch(
        queryKey,
        async () => {
          await wait(100);
          return queryData;
        },
        false,
        true
      );
      expect(cache.d[queryKey]).toMatchObject({
        data: undefined,
        isLoading: true,
        error: undefined,
      });
    });

    it("should set query state to error if fetching fails", async () => {
      const cache = createCache();
      let error = new Error("error");
      await cache.fetch(
        queryKey,
        () => {
          throw error;
        },
        false,
        true
      );
      expect(cache.d[queryKey]).toMatchObject({
        data: undefined,
        isLoading: false,
        error: error,
      });
    });

    it("should set query state after fetching", async () => {
      const cache = createCache();
      await cache.fetch(queryKey, () => queryData, false, true);
      expect(cache.d[queryKey]).toMatchObject({
        data: queryData,
        isLoading: false,
        error: undefined,
      });
    });

    it("should not fetch query if it's already loading", async () => {
      const cache = createCache();
      cache.fetch(
        queryKey,
        async () => {
          await wait(100);
          return queryData;
        },
        false,
        true
      );
      const secondGetter = vi.fn();
      await cache.fetch(queryKey, async () => queryData, false, true);
      expect(cache.d[queryKey]).toMatchObject({
        data: undefined,
        isLoading: true,
        error: undefined,
      });
      expect(secondGetter).not.toHaveBeenCalled();
    });

    it("should not fetch query if it's not stale", async () => {
      const cache = createCache({
        staleTime: 1000,
      });
      await cache.fetch(queryKey, () => queryData, false, true);
      const secondGetter = vi.fn();
      await cache.fetch(queryKey, secondGetter, false, true);
      expect(secondGetter).not.toHaveBeenCalled();
    });

    it("should fetch query if it's stale", async () => {
      const cache = createCache({
        staleTime: 10,
      });
      await cache.fetch(queryKey, () => queryData, false, true);
      await wait(15);
      await cache.fetch(
        queryKey,
        () => ({
          username: "new",
        }),
        false,
        true
      );
      expect(cache.d[queryKey]).toMatchObject({
        data: {
          username: "new",
        },
        isLoading: false,
        error: undefined,
      });
    });

    it("should fetch query if it's forced even if it's loading", async () => {
      const cache = createCache();
      cache.fetch(
        queryKey,
        async () => {
          await wait(100);
          return queryData;
        },
        false,
        true
      );
      const secondGetter = vi.fn();
      await cache.fetch(queryKey, secondGetter, true, true);
      expect(secondGetter).toHaveBeenCalled();
    });

    it("should fetch query if it's forced even if it's not stale", async () => {
      const cache = createCache({
        staleTime: 1000,
      });
      await cache.fetch(queryKey, () => queryData, false, true);
      const secondGetter = vi.fn();
      await cache.fetch(queryKey, secondGetter, true, true);
      expect(secondGetter).toHaveBeenCalled();
    });
  });

  describe("subscribe", () => {
    it("should call callback when query state changes", () => {
      const cache = createCache();
      const callback = vi.fn();
      cache.sub(queryKey, callback);
      cache.set(queryKey, { data: queryData });
      expect(callback).toHaveBeenCalled();
    });

    it("should not call callback when notify is false", () => {
      const cache = createCache();
      const callback = vi.fn();
      cache.sub(queryKey, callback);
      cache.set(queryKey, { data: queryData }, false);
      expect(callback).not.toHaveBeenCalled();
    });

    it("should unsubscribe", () => {
      const cache = createCache();
      const callback = vi.fn();
      const unsubscribe = cache.sub(queryKey, callback);
      unsubscribe();
      cache.set(queryKey, { data: queryData });
      expect(callback).not.toHaveBeenCalled();
    });

    it("should not break on error in listener", async () => {
      const cache = createCache();
      const callback = vi.fn(() => {
        throw new Error("error");
      });
      cache.sub(queryKey, callback);
      expect(() =>
        cache.set(queryKey, { data: queryData }, true)
      ).not.toThrowError();
    });
  });

  describe("invalidate", () => {
    it("should invalidate exact key", async () => {
      const cache = createCache();
      await cache.fetch(queryKey, () => queryData, false, true);
      expect(cache.d[queryKey]?.lastFetchedAt).toBeDefined();
      cache.invalidate(queryKey);
      expect(cache.d[queryKey]?.lastFetchedAt).toBeUndefined();
    });

    it("should invalidate keys by prefix", async () => {
      const cache = createCache();
      const prefix = "user-";
      await cache.fetch(prefix + "1", () => queryData, false, true);
      await cache.fetch(prefix + "2", () => queryData, false, true);
      await cache.fetch("other", () => queryData, false, true);
      cache.invalidate(prefix);
      expect(cache.d[prefix + "1"]?.lastFetchedAt).toBeUndefined();
      expect(cache.d[prefix + "2"]?.lastFetchedAt).toBeUndefined();
      expect(cache.d["other"]?.lastFetchedAt).toBeDefined();
    });

    it("should notify listeners on invalidation", async () => {
      const cache = createCache();
      await cache.fetch(queryKey, () => queryData, false, true);
      const callback = vi.fn();
      cache.sub(queryKey, callback);
      cache.invalidate(queryKey);
      expect(callback).toHaveBeenCalled();
    });
  });

  describe("garbage collection", () => {
    it("should remove query state after cache time", async () => {
      const cache = createCache({
        cacheTime: 100,
        garbageCollectorInterval: 5,
      });
      await cache.fetch(queryKey, () => queryData, false, true);
      await wait(150);
      expect(cache.d[queryKey]).toBeUndefined();
      cache.toggleGc(false);
    });

    it("should not remove query state before cache time", async () => {
      const cache = createCache({
        cacheTime: 100,
        garbageCollectorInterval: 5,
      });
      await cache.fetch(queryKey, () => queryData, false, true);
      await wait(50);
      expect(cache.d[queryKey]).toMatchObject({
        data: queryData,
        isLoading: false,
        error: undefined,
      });
      cache.toggleGc(false);
    });

    it("should not remove query state if cache time is 0", async () => {
      const cache = createCache({
        cacheTime: 0,
        garbageCollectorInterval: 5,
      });
      await cache.fetch(queryKey, () => queryData, false, true);
      await wait(50);
      expect(cache.d[queryKey]).toMatchObject({
        data: queryData,
        isLoading: false,
        error: undefined,
      });
      cache.toggleGc(false);
    });

    it("should not remove query state if garbage collector is disabled", async () => {
      const cache = createCache({
        cacheTime: 100,
        garbageCollectorInterval: 5,
      });
      await cache.fetch(queryKey, () => queryData, false, true);
      cache.toggleGc(false);
      await wait(150);
      expect(cache.d[queryKey]).toMatchObject({
        data: queryData,
        isLoading: false,
        error: undefined,
      });
    });

    it("should remove query state after cache time", async () => {
      const cache = createCache({
        cacheTime: 100,
        garbageCollectorInterval: 5,
      });
      await cache.fetch(queryKey, () => queryData, false, true);
      await wait(150);
      expect(cache.d[queryKey]).toBeUndefined();
      cache.toggleGc(false);
    });

    it("should not remove query state if there are active subscriptions", async () => {
      const cache = createCache({
        cacheTime: 100,
        garbageCollectorInterval: 5,
      });
      const callback = vi.fn();
      cache.sub(queryKey, callback);
      await cache.fetch(queryKey, () => queryData, false, true);
      await wait(150);
      expect(cache.d[queryKey]).toMatchObject({
        data: queryData,
        isLoading: false,
        error: undefined,
      });
      cache.toggleGc(false);
    });
  });
});
