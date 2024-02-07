import { beforeEach, describe, expect, it, jest } from "@jest/globals";
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
      cache.initQueryState(queryKey);
      expect(cache.data[queryKey]).toEqual({
        data: undefined,
        isLoading: false,
        error: undefined,
        cacheTime: 300000,
        staleTime: 30000,
      });
    });
  });

  describe("getQueryState", () => {
    it("should return query state", () => {
      const cache = createCache();
      cache.setQueryState(queryKey, { data: queryData });
      expect(cache.getQueryState(queryKey)).toEqual({
        data: queryData,
        isLoading: false,
        error: undefined,
        cacheTime: 5 * 60 * 1000,
        staleTime: 0,
      });
    });

    it("should return undefined if query doesn't exist", () => {
      const cache = createCache();
      expect(cache.getQueryState(queryKey)).toBeUndefined();
    });
  });

  describe("setQueryParams", () => {
    it("should set custom params on setQueryState", () => {
      const cache = createCache();
      cache.setQueryState(queryKey, {
        data: queryData,
        cacheTime: 1000,
        staleTime: 1000,
      });
      expect(cache.data[queryKey]).toEqual({
        data: queryData,
        isLoading: false,
        error: undefined,
        cacheTime: 1000,
        staleTime: 1000,
      });
    });
    it("should set default params on setQueryState if it didn't exist", () => {
      const cache = createCache();
      cache.setQueryState(queryKey, { data: queryData });
      expect(cache.data[queryKey]).toMatchObject({
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
        await cache.fetchQuery(queryKey, () => queryData, false);
      }).not.toThrow();
    });

    it("should set query state to loading before fetching", async () => {
      const cache = createCache();
      cache.fetchQuery(
        queryKey,
        async () => {
          await wait(100);
          return queryData;
        },
        false
      );
      expect(cache.data[queryKey]).toMatchObject({
        data: undefined,
        isLoading: true,
        error: undefined,
      });
    });

    it("should set query state to error if fetching fails", async () => {
      const cache = createCache();
      let error = new Error("error");
      await cache.fetchQuery(
        queryKey,
        () => {
          throw error;
        },
        false
      );
      expect(cache.data[queryKey]).toMatchObject({
        data: undefined,
        isLoading: false,
        error: error,
      });
    });

    it("should set query state after fetching", async () => {
      const cache = createCache();
      await cache.fetchQuery(queryKey, () => queryData, false);
      expect(cache.data[queryKey]).toMatchObject({
        data: queryData,
        isLoading: false,
        error: undefined,
      });
    });

    it("should not fetch query if it's already loading", async () => {
      const cache = createCache();
      cache.fetchQuery(
        queryKey,
        async () => {
          await wait(100);
          return queryData;
        },
        false
      );
      const secondGetter = jest.fn();
      await cache.fetchQuery(queryKey, async () => queryData, false);
      expect(cache.data[queryKey]).toMatchObject({
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
      await cache.fetchQuery(queryKey, () => queryData, false);
      const secondGetter = jest.fn();
      await cache.fetchQuery(queryKey, secondGetter, false);
      expect(secondGetter).not.toHaveBeenCalled();
    });

    it("should fetch query if it's stale", async () => {
      const cache = createCache({
        staleTime: 10,
      });
      await cache.fetchQuery(queryKey, () => queryData, false);
      await wait(15);
      await cache.fetchQuery(
        queryKey,
        () => ({
          username: "new",
        }),
        false
      );
      expect(cache.data[queryKey]).toMatchObject({
        data: {
          username: "new",
        },
        isLoading: false,
        error: undefined,
      });
    });

    it("should fetch query if it's forced even if it's loading", async () => {
      const cache = createCache();
      cache.fetchQuery(
        queryKey,
        async () => {
          await wait(100);
          return queryData;
        },
        false
      );
      const secondGetter = jest.fn();
      await cache.fetchQuery(queryKey, secondGetter, true);
      expect(secondGetter).toHaveBeenCalled();
    });

    it("should fetch query if it's forced even if it's not stale", async () => {
      const cache = createCache({
        staleTime: 1000,
      });
      await cache.fetchQuery(queryKey, () => queryData, false);
      const secondGetter = jest.fn();
      await cache.fetchQuery(queryKey, secondGetter, true);
      expect(secondGetter).toHaveBeenCalled();
    });
  });

  describe("subscribe", () => {
    it("should call callback when query state changes", () => {
      const cache = createCache();
      const callback = jest.fn();
      cache.subscribe(queryKey, callback);
      cache.setQueryState(queryKey, { data: queryData });
      expect(callback).toHaveBeenCalled();
    });

    it("should not call callback when notify is false", () => {
      const cache = createCache();
      const callback = jest.fn();
      cache.subscribe(queryKey, callback);
      cache.setQueryState(queryKey, { data: queryData }, false);
      expect(callback).not.toHaveBeenCalled();
    });

    it("should unsubscribe", () => {
      const cache = createCache();
      const callback = jest.fn();
      const unsubscribe = cache.subscribe(queryKey, callback);
      unsubscribe();
      cache.setQueryState(queryKey, { data: queryData });
      expect(callback).not.toHaveBeenCalled();
    });

    it("should not break on error in listener", async () => {
      const cache = createCache();
      const callback = jest.fn(() => {
        throw new Error("error");
      });
      cache.subscribe(queryKey, callback);
      expect(() =>
        cache.setQueryState(queryKey, { data: queryData }, true)
      ).not.toThrowError();
    });
  });

  describe("garbage collection", () => {
    it("should remove query state after cache time", async () => {
      const cache = createCache({
        cacheTime: 100,
        garbageCollectorInterval: 5,
      });
      await cache.fetchQuery(queryKey, () => queryData, false);
      await wait(150);
      expect(cache.data[queryKey]).toBeUndefined();
      cache.toggleGarbageCollector(false);
    });

    it("should not remove query state before cache time", async () => {
      const cache = createCache({
        cacheTime: 100,
        garbageCollectorInterval: 5,
      });
      await cache.fetchQuery(queryKey, () => queryData, false);
      await wait(50);
      expect(cache.data[queryKey]).toMatchObject({
        data: queryData,
        isLoading: false,
        error: undefined,
      });
      cache.toggleGarbageCollector(false);
    });

    it("should not remove query state if cache time is 0", async () => {
      const cache = createCache({
        cacheTime: 0,
        garbageCollectorInterval: 5,
      });
      await cache.fetchQuery(queryKey, () => queryData, false);
      await wait(50);
      expect(cache.data[queryKey]).toMatchObject({
        data: queryData,
        isLoading: false,
        error: undefined,
      });
      cache.toggleGarbageCollector(false);
    });

    it("should not remove query state if garbage collector is disabled", async () => {
      const cache = createCache({
        cacheTime: 100,
        garbageCollectorInterval: 5,
      });
      await cache.fetchQuery(queryKey, () => queryData, false);
      cache.toggleGarbageCollector(false);
      await wait(150);
      expect(cache.data[queryKey]).toMatchObject({
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
      await cache.fetchQuery(queryKey, () => queryData, false);
      await wait(150);
      expect(cache.data[queryKey]).toBeUndefined();
      cache.toggleGarbageCollector(false);
    });

    it("should not remove query state if there are active subscriptions", async () => {
      const cache = createCache({
        cacheTime: 100,
        garbageCollectorInterval: 5,
      });
      const callback = jest.fn();
      cache.subscribe(queryKey, callback);
      await cache.fetchQuery(queryKey, () => queryData, false);
      await wait(150);
      expect(cache.data[queryKey]).toMatchObject({
        data: queryData,
        isLoading: false,
        error: undefined,
      });
      cache.toggleGarbageCollector(false);
    });
  });
});
