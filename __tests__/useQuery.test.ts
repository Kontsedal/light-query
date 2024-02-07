import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { faker } from "@faker-js/faker";
import { createCache, useQuery } from "../lib";
import { act, renderHook, waitFor } from "@testing-library/react";
import { wait } from "./utils";

describe("useQuery", () => {
  let queryKey: string = "";
  let queryData: { username: string } = { username: "" };
  beforeEach(() => {
    queryKey = faker.string.nanoid();
    queryData = {
      username: faker.internet.userName(),
    };
  });

  it("should go from loading to loaded state", async () => {
    const cache = createCache();
    const { result } = renderHook(() =>
      useQuery(
        {
          key: queryKey,
          getter: async () => {
            await wait(50);
            return queryData;
          },
        },
        cache
      )
    );
    expect(result.current).toMatchObject({
      data: undefined,
      isLoading: true,
      error: undefined,
    });
    await waitFor(() => {
      expect(result.current).toMatchObject({
        data: queryData,
        isLoading: false,
        error: undefined,
      });
    });
  });

  it("should go from loading to error state", async () => {
    const cache = createCache();
    const error = new Error("error");
    const { result } = renderHook(() =>
      useQuery(
        {
          key: queryKey,
          getter: async () => {
            await wait(50);
            throw error;
          },
        },
        cache
      )
    );
    expect(result.current).toMatchObject({
      data: undefined,
      isLoading: true,
      error: undefined,
    });
    await waitFor(() => {
      expect(result.current).toMatchObject({
        data: undefined,
        isLoading: false,
        error: error,
      });
    });
  });

  it("should return the same data if it's not stale", async () => {
    const cache = createCache({
      staleTime: 5000,
    });
    await cache.fetchQuery(queryKey, () => queryData, false);
    const { result } = renderHook(() =>
      useQuery(
        {
          key: queryKey,
          getter: async () => {
            await wait(50);
            return { username: "new" };
          },
        },
        cache
      )
    );
    expect(result.current).toMatchObject({
      data: queryData,
      isLoading: false,
      error: undefined,
    });
  });

  it("should return the new data if it's stale", async () => {
    const cache = createCache({
      staleTime: 10,
    });
    await cache.fetchQuery(queryKey, () => queryData, false);
    await wait(15);
    const { result } = renderHook(() =>
      useQuery(
        {
          key: queryKey,
          getter: async () => {
            await wait(50);
            return { username: "new" };
          },
        },
        cache
      )
    );
    await waitFor(() => {
      expect(result.current).toMatchObject({
        data: { username: "new" },
        isLoading: false,
        error: undefined,
      });
    });
  });

  it("should refetch the query after the interval", async () => {
    const getter = jest.fn(() => queryData);
    const cache = createCache();
    renderHook(() =>
      useQuery(
        {
          key: queryKey,
          getter,
          refetchInterval: 10,
        },
        cache
      )
    );
    await act(async () => {
      await wait(25);
    });
    expect(getter).toHaveBeenCalledTimes(3);
  });

  it("should support refetchInterval as a function", async () => {
    const getter = jest.fn(() => queryData);
    const refetchInterval = jest.fn(() => 10);
    const cache = createCache();
    renderHook(() =>
      useQuery(
        {
          key: queryKey,
          getter,
          refetchInterval,
        },
        cache
      )
    );
    await act(async () => {
      await wait(25);
    });
    expect(getter).toHaveBeenCalledTimes(3);
    expect(refetchInterval).toHaveBeenCalledTimes(3);
  });

  it("should not refetch the query if the interval is 0", async () => {
    const getter = jest.fn(() => queryData);
    const cache = createCache();
    renderHook(() =>
      useQuery(
        {
          key: queryKey,
          getter,
          refetchInterval: () => 0,
        },
        cache
      )
    );
    await act(async () => {
      await wait(25);
    });
    expect(getter).toHaveBeenCalledTimes(1);
  });

  it("should receive a previous data into the refetchInterval function", async () => {
    const getter = jest.fn(() => queryData);
    const refetchInterval = jest.fn(() => 10);
    const cache = createCache();
    renderHook(() =>
      useQuery(
        {
          key: queryKey,
          getter,
          refetchInterval,
        },
        cache
      )
    );
    await act(async () => {
      await wait(25);
    });
    expect(refetchInterval).toHaveBeenCalledWith(queryData);
  });

  it("should allow to define cacheTime and staleTime", async () => {
    const cache = createCache({
      cacheTime: 1000,
      staleTime: 500,
    });
    renderHook(() =>
      useQuery(
        {
          key: queryKey,
          getter: async () => {
            await wait(50);
            return queryData;
          },
          cacheTime: 1000,
          staleTime: 500,
        },
        cache
      )
    );
    expect(cache.getQueryState(queryKey)).toMatchObject({
      cacheTime: 1000,
      staleTime: 500,
    });
  });

  it("should allow to refetch query manually", async () => {
    const cache = createCache({
      staleTime: 100000,
    });
    const getter = jest.fn(() => queryData);
    const { result } = renderHook(() =>
      useQuery(
        {
          key: queryKey,
          getter,
        },
        cache
      )
    );
    await act(async () => {
      await result.current.refetch();
    });
    expect(getter).toHaveBeenCalledTimes(2);
  });
});
