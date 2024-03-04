import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { faker } from "@faker-js/faker";
import { act, renderHook } from "@testing-library/react";
import { usePagination, UsePaginationFetchFn } from "../lib";

describe("usePagination", () => {
  let queryKey: string = "";
  beforeEach(() => {
    queryKey = faker.string.nanoid();
  });

  it("should return correct initial state", async () => {
    const page = [{ a: 1 }, { a: 2 }, { a: 3 }];
    const fetchFn = () => page;
    const { result } = renderHook(() =>
      usePagination(queryKey, fetchFn, {
        getFetchPageParams: () => undefined,
      })
    );
    await act(async () => {});
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
    const { result } = renderHook(() =>
      usePagination(queryKey, fetchFn, {
        getFetchPageParams: (requestedPage) => requestedPage,
      })
    );
    await act(async () => {});
    await act(async () => {
      result.current.fetchPage(2);
    });
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
    const { result } = renderHook(() =>
      usePagination(queryKey, fetchFn, {
        getFetchPageParams: (requestedPage) => {
          return requestedPage;
        },
      })
    );
    await act(async () => {});
    await act(async () => {
      result.current.fetchPage(20);
    });
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
      })
    );
    await act(async () => {});
    expect(result.current.hasPage(1)).toBe(true);
    expect(result.current.hasPage(2)).toBe(false);
  });
});
