import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createCache } from "../lib";
import { faker } from "@faker-js/faker";

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
        await cache.fetchQuery(queryKey, () => queryData);
      }).not.toThrow();
    });

    it("should set query state to loading before fetching", async () => {
      const cache = createCache();
      cache.fetchQuery(queryKey, async () => {
        await wait(100);
        return queryData;
      });
      expect(cache.data[queryKey]).toMatchObject({
        data: undefined,
        isLoading: true,
        error: undefined,
      });
    });

    it("should set query state to error if fetching fails", async () => {
      const cache = createCache();
      let error = new Error("error");
      await cache.fetchQuery(queryKey, () => {
        throw error;
      });
      expect(cache.data[queryKey]).toMatchObject({
        data: undefined,
        isLoading: false,
        error: error,
      });
    });

    it("should set query state after fetching", async () => {
      const cache = createCache();
      await cache.fetchQuery(queryKey, () => queryData);
      expect(cache.data[queryKey]).toMatchObject({
        data: queryData,
        isLoading: false,
        error: undefined,
      });
    });

    it("should not fetch query if it's already loading", async () => {
      const cache = createCache();
      cache.fetchQuery(queryKey, async () => {
        await wait(100);
        return queryData;
      });
      const secondGetter = jest.fn();
      await cache.fetchQuery(queryKey, async () => queryData);
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
      await cache.fetchQuery(queryKey, () => queryData);
      const secondGetter = jest.fn();
      await cache.fetchQuery(queryKey, secondGetter);
      expect(secondGetter).not.toHaveBeenCalled();
    });

    it("should fetch query if it's stale", async () => {
      const cache = createCache({
        staleTime: 100,
      });
      await cache.fetchQuery(queryKey, () => queryData);
      await wait(100);
      await cache.fetchQuery(queryKey, () => ({
        username: "new",
      }));
      expect(cache.data[queryKey]).toMatchObject({
        data: {
          username: "new",
        },
        isLoading: false,
        error: undefined,
      });
    });
  });
});

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
