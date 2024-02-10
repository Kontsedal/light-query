import { useQuery, UseQueryOptions } from "./useQuery";
import { useMemo, useState } from "react";

export const usePagination = <T, D>(
  key: string,
  fetchFn: UsePaginationFetchFn<T, D>,
  params: UsePaginationOptions<T, D>
) => {
  const [currentPageNumber, setCurrentPageNumber] = useState(
    params?.defaultPage ?? 1
  );
  const currentPageKey = `${key}#[${currentPageNumber}]`;
  const [pages, setPages] = useState<T[]>([]);
  const query = useQuery(
    currentPageKey,
    async () => {
      let paginationParams = params.getFetchPageParams?.(
        currentPageNumber,
        currentPageNumber,
        pages?.[currentPageNumber],
        pages
      );
      const result = await fetchFn(paginationParams);
      setPages((prev) => {
        const newPages = [...prev];
        newPages[currentPageNumber] = result;
        return newPages;
      });
      return result;
    },
    params
  );

  return useMemo(() => {
    const result = {
      ...query,
      pages: pages.filter(Boolean),
      pageNumber: currentPageNumber,
      hasPage(pageNumber: number) {
        return !!params.getFetchPageParams(
          pageNumber,
          currentPageNumber,
          pages?.[pageNumber],
          pages
        );
      },
      fetchPage(pageNumber: number) {
        if (result.hasPage(pageNumber)) {
          setCurrentPageNumber(pageNumber);
        }
      },
    };
    return result;
  }, [query, pages, currentPageNumber]);
};

export type UsePaginationOptions<T, D> = UseQueryOptions<T> & {
  defaultPage?: number;
  getFetchPageParams: (
    requestedPageNumber: number,
    currentPageNumber: number,
    currentPage: T | undefined,
    allPages: T[]
  ) => D | undefined;
};

export type UsePaginationFetchFn<T, D> = (
  paginationParams: D | undefined
) => Promise<T> | T;
