import { faker } from "@faker-js/faker";
import { act, renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { createCache, useQuery } from "../lib";
import { wait, waitUntil } from "./utils";

describe("useQuery", () => {
  let queryKey: string = "";
  let queryData: { username: string } = { username: "" };
  beforeEach(() => {
    queryKey = faker.string.nanoid();
    queryData = {
      username: faker.internet.username(),
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
        },
      ),
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
        },
      ),
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
        },
      ),
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
        { cache },
      ),
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
    const getter = vi.fn(() => queryData);
    const refetchInterval = vi.fn(() => 10);
    const cache = createCache();
    renderHook(() =>
      useQuery(queryKey, getter, {
        refetchInterval,
        cache,
      }),
    );
    await act(async () => {
      await wait(25);
    });
    expect(getter).toHaveBeenCalledTimes(3);
    expect(refetchInterval).toHaveBeenCalledTimes(3);
  });

  it("should not refetch the query if the interval is 0", async () => {
    const getter = vi.fn(() => queryData);
    const cache = createCache();
    renderHook(() =>
      useQuery(queryKey, getter, {
        refetchInterval: () => 0,
        cache,
      }),
    );
    await act(async () => {
      await wait(25);
    });
    expect(getter).toHaveBeenCalledTimes(1);
  });

  it("should receive a previous data into the refetchInterval function", async () => {
    const getter = vi.fn(() => queryData);
    const refetchInterval = vi.fn(() => 10);
    const cache = createCache();
    renderHook(() =>
      useQuery(queryKey, getter, {
        refetchInterval,
        cache,
      }),
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
        },
      ),
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
    const getter = vi.fn(() => queryData);
    const { result } = renderHook(() =>
      useQuery(queryKey, getter, {
        cache,
      }),
    );
    await act(async () => {
      await result.current.refetch();
    });
    expect(getter).toHaveBeenCalledTimes(2);
  });

  describe("refetch on window focus", () => {
    it("should refetch the query on window focus", async () => {
      const getter = vi.fn(() => queryData);
      const cache = createCache();
      renderHook(() =>
        useQuery(queryKey, getter, {
          refetchOnWindowFocus: true,
          cache,
        }),
      );
      await act(async () => {
        window.dispatchEvent(new Event("focus"));
      });
      expect(getter).toHaveBeenCalledTimes(2);
    });

    it("should not refetch the query on window focus if it's disabled", async () => {
      const getter = vi.fn(() => queryData);
      const cache = createCache();
      renderHook(() =>
        useQuery(queryKey, getter, {
          refetchOnWindowFocus: false,
          cache,
        }),
      );
      await act(async () => {
        window.dispatchEvent(new Event("focus"));
      });
      expect(getter).toHaveBeenCalledTimes(1);
    });

    it("should get default value from cache if not provided", async () => {
      const getter = vi.fn(() => queryData);
      const cache = createCache({
        refetchOnWindowFocus: true,
      });
      renderHook(() =>
        useQuery(queryKey, getter, {
          cache,
        }),
      );
      await act(async () => {
        window.dispatchEvent(new Event("focus"));
      });
      expect(getter).toHaveBeenCalledTimes(2);
    });
  });

  describe("refetch on window online event", () => {
    it("should refetch the query on reconnect", async () => {
      const getter = vi.fn(() => queryData);
      const cache = createCache();
      renderHook(() =>
        useQuery(queryKey, getter, {
          refetchOnReconnect: true,
          cache,
        }),
      );
      await act(async () => {
        window.dispatchEvent(new Event("online"));
      });
      expect(getter).toHaveBeenCalledTimes(2);
    });

    it("should not refetch the query on online if it's disabled", async () => {
      const getter = vi.fn(() => queryData);
      const cache = createCache();
      renderHook(() =>
        useQuery(queryKey, getter, {
          refetchOnReconnect: false,
          cache,
        }),
      );
      await act(async () => {
        window.dispatchEvent(new Event("online"));
      });
      expect(getter).toHaveBeenCalledTimes(1);
    });

    it("should get default value from cache if not provided", async () => {
      const getter = vi.fn(() => queryData);
      const cache = createCache({
        refetchOnReconnect: true,
      });
      renderHook(() =>
        useQuery(queryKey, getter, {
          cache,
        }),
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
      const error = new Error("error");
      const getter = vi.fn(() => {
        throw error;
      });
      const cache = createCache();
      renderHook(() =>
        useQuery(queryKey, getter, {
          retry: () => 0,
          cache,
        }),
      );
      await act(async () => {
        await wait(50);
      });
      expect(getter).toHaveBeenCalledTimes(1);
    });

    it("should retry if the retry function returns a positive number", async () => {
      const error = new Error("error");
      const getter = vi.fn(() => {
        throw error;
      });
      const cache = createCache();
      const { result } = renderHook(() =>
        useQuery(queryKey, getter, {
          retry: (attempt) => (attempt === 1 ? 10 : 0),
          cache,
        }),
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
      const error = new Error("error");
      const getter = vi.fn(() => {
        throw error;
      });
      const cache = createCache();
      const { result } = renderHook(() =>
        useQuery(queryKey, getter, {
          retry: () => 100,
          cache,
        }),
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
      const error = new Error("error");
      const getter = vi.fn(() => {
        throw error;
      });
      const cache = createCache();
      renderHook(() =>
        useQuery(queryKey, getter, {
          retry: () => 100,
          refetchInterval: () => 100,
          cache,
        }),
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
      { initialProps: { key: initialQueryKey, enabled: true } },
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
      isIdle: true,
      isFetched: false,
    });
  });

  it("should return boolean isUpdating", async () => {
    const cache = createCache();
    const { result } = renderHook(() =>
      useQuery(
        queryKey,
        async () => {
          await wait(50);
          return queryData;
        },
        { cache },
      ),
    );
    await waitFor(() => {
      expect(result.current.data).toEqual(queryData);
    });
    act(() => {
      result.current.refetch();
    });
    expect(typeof result.current.isUpdating).toBe("boolean");
  });

  it("should return isSuccess, isError, and isFetched", async () => {
    const cache = createCache();
    const { result } = renderHook(() =>
      useQuery(
        queryKey,
        async () => {
          await wait(50);
          return queryData;
        },
        { cache },
      ),
    );
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.isFetched).toBe(false);
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
      expect(result.current.isFetched).toBe(true);
    });
  });

  it("should set isError on fetch failure", async () => {
    const error = new Error("error");
    const cache = createCache();
    const { result, rerender } = renderHook(() =>
      useQuery(
        queryKey,
        async () => {
          throw error;
        },
        { cache },
      ),
    );
    await act(async () => {
      await wait(50);
    });
    rerender();
    expect(result.current.isError).toBe(true);
    expect(result.current.isSuccess).toBe(false);
  });

  it("should allow to set data manually with setData", async () => {
    const cache = createCache();
    const myData = { username: "test-user" };
    const { result, rerender } = renderHook(() =>
      useQuery(queryKey, () => myData, { cache }),
    );
    await act(async () => {});
    await waitUntil(async () => {
      rerender();
      return result.current.data === myData;
    });
    const newData = { username: "manual" };
    act(() => {
      result.current.setData(newData);
    });
    rerender();
    expect(result.current.data).toEqual(newData);
  });

  it("should allow to set data with updater function", async () => {
    const cache = createCache();
    const myData = { username: "test-user" };
    const { result, rerender } = renderHook(() =>
      useQuery(queryKey, () => myData, { cache }),
    );
    await act(async () => {});
    await waitUntil(async () => {
      rerender();
      return result.current.data === myData;
    });
    act(() => {
      result.current.setData((prev) => ({
        username: `${prev?.username ?? ""}_updated`,
      }));
    });
    rerender();
    expect(result.current.data).toEqual({
      username: "test-user_updated",
    });
  });

  it("should use initialData when provided", async () => {
    const cache = createCache();
    const initialData = { username: "initial" };
    const { result } = renderHook(() =>
      useQuery(
        queryKey,
        async () => {
          await wait(100);
          return queryData;
        },
        { cache, initialData },
      ),
    );
    expect(result.current.data).toEqual(initialData);
  });

  it("should call onSuccess callback after successful fetch", async () => {
    const cache = createCache();
    const onSuccess = vi.fn();
    renderHook(() =>
      useQuery(queryKey, async () => queryData, { cache, onSuccess }),
    );
    await act(async () => {
      await wait(50);
    });
    expect(onSuccess).toHaveBeenCalledWith(queryData);
  });

  it("should call onError callback after failed fetch", async () => {
    const cache = createCache();
    const error = new Error("error");
    const onError = vi.fn();
    renderHook(() =>
      useQuery(
        queryKey,
        async () => {
          throw error;
        },
        { cache, onError },
      ),
    );
    await act(async () => {
      await wait(50);
    });
    expect(onError).toHaveBeenCalledWith(error);
  });
});
