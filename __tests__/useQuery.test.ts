import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { faker } from "@faker-js/faker";
import { createCache, useQuery } from "../lib";
import { act, renderHook, waitFor } from "@testing-library/react";
import { wait, waitUntil } from "./utils";

describe("useQuery", () => {
  let queryKey: string = "";
  let queryData: { username: string } = { username: "" };
  beforeEach(() => {
    queryKey = faker.string.nanoid();
    queryData = {
      username: faker.internet.userName(),
    };
  });

  it("should not throw error on forced cache", async () => {
    const cache = createCache();
    const { result } = renderHook(() => {
      return useQuery(queryKey, async () => queryData, {
        cache,
      });
    });
    await act(async () => {});
    expect(result.current).toBeDefined();
  });

  it("should not throw error on context cache", async () => {
    const { result } = renderHook(() => {
      return useQuery(queryKey, async () => queryData);
    });
    await act(async () => {});
    expect(result.current).toBeDefined();
  });

  it("should go from loading to loaded state", async () => {
    const cache = createCache();
    const { result } = renderHook(() =>
      useQuery(
        queryKey,
        async () => {
          await wait(50);
          return queryData;
        },
        {
          cache: cache,
        }
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
        queryKey,
        async () => {
          await wait(50);
          throw error;
        },
        {
          cache,
        }
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

  it("should return the same d if it's not stale", async () => {
    const cache = createCache({
      staleTime: 5000,
    });
    await cache.fetch(queryKey, () => queryData, false, true);
    const { result } = renderHook(() =>
      useQuery(
        queryKey,
        async () => {
          await wait(50);
          return { username: "new" };
        },
        {
          cache,
        }
      )
    );
    expect(result.current).toMatchObject({
      data: queryData,
      isLoading: false,
      error: undefined,
    });
  });

  it("should return the new d if it's stale", async () => {
    const cache = createCache({
      staleTime: 10,
    });
    await cache.fetch(queryKey, () => queryData, false, true);
    await wait(15);
    const { result } = renderHook(() =>
      useQuery(
        queryKey,
        async () => {
          await wait(50);
          return { username: "new" };
        },
        { cache }
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
    const refetchInterval = jest.fn(() => 10);
    const cache = createCache();
    renderHook(() =>
      useQuery(queryKey, getter, {
        refetchInterval,
        cache,
      })
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
      useQuery(queryKey, getter, {
        refetchInterval: () => 0,
        cache,
      })
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
      useQuery(queryKey, getter, {
        refetchInterval,
        cache,
      })
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
        queryKey,
        async () => {
          await wait(50);
          return queryData;
        },
        {
          cache,
          cacheTime: 1000,
          staleTime: 500,
        }
      )
    );
    expect(cache.get(queryKey)).toMatchObject({
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
      useQuery(queryKey, getter, {
        cache,
      })
    );
    await act(async () => {
      await result.current.refetch();
    });
    expect(getter).toHaveBeenCalledTimes(2);
  });

  describe("refetch on window focus", () => {
    it("should refetch the query on window focus", async () => {
      const getter = jest.fn(() => queryData);
      const cache = createCache();
      renderHook(() =>
        useQuery(queryKey, getter, {
          refetchOnWindowFocus: true,
          cache,
        })
      );
      await act(async () => {
        window.dispatchEvent(new Event("focus"));
      });
      expect(getter).toHaveBeenCalledTimes(2);
    });

    it("should not refetch the query on window focus if it's disabled", async () => {
      const getter = jest.fn(() => queryData);
      const cache = createCache();
      renderHook(() =>
        useQuery(queryKey, getter, {
          refetchOnWindowFocus: false,
          cache,
        })
      );
      await act(async () => {
        window.dispatchEvent(new Event("focus"));
      });
      expect(getter).toHaveBeenCalledTimes(1);
    });

    it("should get default value from cache if not provided", async () => {
      const getter = jest.fn(() => queryData);
      const cache = createCache({
        refetchOnWindowFocus: true,
      });
      renderHook(() =>
        useQuery(queryKey, getter, {
          cache,
        })
      );
      await act(async () => {
        window.dispatchEvent(new Event("focus"));
      });
      expect(getter).toHaveBeenCalledTimes(2);
    });
  });

  describe("refetch on window online event", () => {
    it("should refetch the query on reconnect", async () => {
      const getter = jest.fn(() => queryData);
      const cache = createCache();
      renderHook(() =>
        useQuery(queryKey, getter, {
          refetchOnReconnect: true,
          cache,
        })
      );
      await act(async () => {
        window.dispatchEvent(new Event("online"));
      });
      expect(getter).toHaveBeenCalledTimes(2);
    });

    it("should not refetch the query on online if it's disabled", async () => {
      const getter = jest.fn(() => queryData);
      const cache = createCache();
      renderHook(() =>
        useQuery(queryKey, getter, {
          refetchOnReconnect: false,
          cache,
        })
      );
      await act(async () => {
        window.dispatchEvent(new Event("online"));
      });
      expect(getter).toHaveBeenCalledTimes(1);
    });

    it("should get default value from cache if not provided", async () => {
      const getter = jest.fn(() => queryData);
      const cache = createCache({
        refetchOnReconnect: true,
      });
      renderHook(() =>
        useQuery(queryKey, getter, {
          cache,
        })
      );
      await act(async () => {
        window.dispatchEvent(new Event("online"));
      });
      expect(getter).toHaveBeenCalledTimes(2);
    });
  });

  describe("retry", () => {
    it("should not retry if the retry function returns 0", async () => {
      const queryKey = faker.string.nanoid();
      let error = new Error("error");
      const getter = jest.fn(() => {
        throw error;
      });
      const cache = createCache();
      renderHook(() =>
        useQuery(queryKey, getter, {
          retry: () => 0,
          cache,
        })
      );
      await act(async () => {
        await wait(50);
      });
      expect(getter).toHaveBeenCalledTimes(1);
    });

    it("should retry if the retry function returns a positive number", async () => {
      let error = new Error("error");
      const getter = jest.fn(() => {
        throw error;
      });
      const cache = createCache();
      const { result } = renderHook(() =>
        useQuery(queryKey, getter, {
          retry: (attempt) => (attempt === 1 ? 10 : 0),
          cache,
        })
      );
      await act(async () => {
        await wait(50);
      });
      expect(getter).toHaveBeenCalledTimes(2);
      expect(result.current).toMatchObject({
        data: undefined,
        isLoading: false,
        error: error,
      });
    });

    it("should not set error during retry", async () => {
      let error = new Error("error");
      const getter = jest.fn(() => {
        throw error;
      });
      const cache = createCache();
      const { result } = renderHook(() =>
        useQuery(queryKey, getter, {
          retry: () => 100,
          cache,
        })
      );
      await act(async () => {
        await wait(50);
      });
      expect(result.current).toMatchObject({
        data: undefined,
        isLoading: true,
        error: undefined,
      });
    });

    it("should not refetch on interval during retry", async () => {
      let error = new Error("error");
      const getter = jest.fn(() => {
        throw error;
      });
      const cache = createCache();
      renderHook(() =>
        useQuery(queryKey, getter, {
          retry: () => 100,
          refetchInterval: () => 100,
          cache,
        })
      );
      await act(async () => {
        await wait(90);
      });
      expect(getter).toHaveBeenCalledTimes(1);
    });
  });

  it("should do nothing if the query is disabled", async () => {
    const cache = createCache();
    const { result } = renderHook(() => {
      return useQuery(queryKey, async () => queryData, {
        enabled: false,
        cache,
      });
    });
    await act(async () => {});
    expect(result.current).toMatchObject({
      data: undefined,
      isLoading: false,
      error: undefined,
    });
  });

  it("should return the different data on query key change with disable", async () => {
    const cache = createCache();
    const initialQueryKey = faker.string.nanoid();
    const newQueryKey = faker.string.nanoid();
    const initialQueryData = { username: "initial" };
    const { result, rerender } = renderHook(
      (props: { key: string; enabled: boolean }) => {
        return useQuery(props.key, async () => initialQueryData, {
          enabled: props.enabled,
          cache,
        });
      },
      { initialProps: { key: initialQueryKey, enabled: true } }
    );
    await act(async () => {});
    rerender({ key: newQueryKey, enabled: false });
    await act(async () => {});
    expect(result.current).toMatchObject({
      data: undefined,
      isLoading: false,
      error: undefined,
    });
  });

  it("should allow to reset the query", async () => {
    const cache = createCache();
    const { result, rerender } = renderHook(() => {
      return useQuery(queryKey, async () => queryData, {
        cache,
      });
    });
    await act(async () => {});
    await waitUntil(async () => {
      rerender();
      return !result.current.isLoading && result.current.data === queryData;
    });
    await act(async () => {
      result.current.reset();
    });
    await act(async () => {
      rerender();
    });
    await act(async () => {});
    expect(result.current).toMatchObject({
      data: undefined,
      isLoading: false,
      error: undefined,
    });
  });
});
