import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { faker } from "@faker-js/faker";
import { act, renderHook } from "@testing-library/react";
import { createCache, usePagination, UsePaginationFetchFn } from "../lib";
import { wait, waitUntil } from "./utils";

describe("usePagination", () => {
  let queryKey: string = "";
  let cache = createCache();
  beforeEach(() => {
    queryKey = faker.string.nanoid();
    cache = createCache();
  });

  it("should return correct initial state", async () => {
    const page = [{ a: 1 }, { a: 2 }, { a: 3 }];
    const fetchFn = () => page;
    const { result } = renderHook(() =>
      usePagination(queryKey, fetchFn, {
        getFetchPageParams: () => undefined,
        cache,
      })
    );
    await act(async () => {
      await wait(50);
    });
    expect(result.current).toMatchObject({
      data: page,
      pages: [page],
      error: undefined,
      isLoading: false,
      pageNumber: 1,
      hasPage: expect.any(Function),
      fetchPage: expect.any(Function),
    });
  });

  it("should call fetch fn with getFetchPageParams result", async () => {
    const fetchFn = jest.fn(() => []);
    const getFetchPageParams = jest.fn(() => ({ page: 1 }));
    renderHook(() =>
      usePagination(queryKey, fetchFn, {
        getFetchPageParams,
        cache,
      })
    );
    await act(async () => {});
    expect(fetchFn).toHaveBeenCalledWith({ page: 1 });
  });

  it("should fetch the next page", async () => {
    const page1 = [{ a: 1 }, { a: 2 }, { a: 3 }];
    const page2 = [{ a: 4 }, { a: 5 }, { a: 6 }];
    const fetchFn: UsePaginationFetchFn<{ a: number }[], number> = (
      requestedPage
    ) => {
      if (requestedPage === 1) {
        return page1;
      }
      if (requestedPage === 2) {
        return page2;
      }
      return [];
    };
    const { result, rerender } = renderHook(() =>
      usePagination(queryKey, fetchFn, {
        getFetchPageParams: (requestedPage) => {
          return requestedPage;
        },
        cache,
      })
    );
    await waitUntil(
      async () => {
        rerender();
        return !result.current.isLoading && result.current.data === page1;
      },
      100,
      30
    );
    result.current.fetchPage(2);

    await waitUntil(
      async () => {
        rerender();
        return !result.current.isLoading && result.current.data === page2;
      },
      100,
      30
    );
    await act(async () => {});
    expect(result.current).toMatchObject({
      data: page2,
      pages: [page1, page2],
      error: undefined,
      isLoading: false,
      pageNumber: 2,
    });
  });

  it("should allow to jump to a page", async () => {
    const page1 = [{ a: 1 }, { a: 2 }, { a: 3 }];
    const page21 = [{ a: 4 }, { a: 5 }, { a: 6 }];
    const fetchFn: UsePaginationFetchFn<{ a: number }[], number> = (
      requestedPage
    ) => {
      if (requestedPage === 1) {
        return page1;
      }
      if (requestedPage === 20) {
        return page21;
      }
      return [];
    };
    const { result, rerender } = renderHook(() =>
      usePagination(queryKey, fetchFn, {
        getFetchPageParams: (requestedPage) => {
          return requestedPage;
        },
        cache,
      })
    );
    await waitUntil(
      async () => {
        rerender();
        return !result.current.isLoading && result.current.data === page1;
      },
      50,
      30
    );
    result.current.fetchPage(20);
    await waitUntil(
      async () => {
        rerender();
        return !result.current.isLoading && result.current.data === page21;
      },
      50,
      30
    );
    expect(result.current).toMatchObject({
      data: page21,
      pages: [page1, page21],
      error: undefined,
      isLoading: false,
      pageNumber: 20,
    });
  });

  it("should allow to check if a page is available", async () => {
    const fetchFn = () => {
      return { a: 1 };
    };
    const { result } = renderHook(() =>
      usePagination(queryKey, fetchFn, {
        getFetchPageParams: (requestedPageNumber) => {
          if (requestedPageNumber === 0 || requestedPageNumber === 1) {
            return requestedPageNumber;
          }
          return undefined;
        },
        cache,
      })
    );
    await act(async () => {});
    expect(result.current.hasPage(1)).toBe(true);
    expect(result.current.hasPage(2)).toBe(false);
  });

  it("should return the different data on query key change with disable", async () => {
    const fetchFn = jest.fn(() => ({ a: 1 }));
    const { result, rerender } = renderHook(
      (props: { key: string; enabled: boolean }) =>
        usePagination(props.key, fetchFn, {
          getFetchPageParams: () => 1,
          enabled: props.enabled,
          cache,
        }),
      {
        initialProps: {
          key: faker.string.nanoid() + "_disabled",
          enabled: true,
        },
      }
    );
    await act(async () => {});
    const newQueryKey = faker.string.nanoid();
    rerender({ key: newQueryKey, enabled: false });
    await act(async () => {});
    expect(result.current).toMatchObject({
      data: undefined,
      pages: [],
      error: undefined,
      isLoading: false,
      pageNumber: 1,
      hasPage: expect.any(Function),
      fetchPage: expect.any(Function),
    });
  });
});
