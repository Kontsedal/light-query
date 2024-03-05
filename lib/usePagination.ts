import { useQuery, UseQueryOptions } from "./useQuery";
import { useMemo, useRef, useState } from "react";

export const usePagination = <T, D>(
  key: string,
  fetchFn: UsePaginationFetchFn<T, D>,
  params: UsePaginationOptions<T, D>
) => {
  const [currentPageNumber, setCurrentPageNumber] = useState(
    params?.defaultPage ?? 1
  );
  const currentPageKey = `${key}#[${currentPageNumber}]`;
  const pages = useRef<T[]>([]);
  const query = useQuery(
    currentPageKey,
    async () => {
      let paginationParams = params.getFetchPageParams?.(
        currentPageNumber,
        currentPageNumber,
        pages.current?.[currentPageNumber],
        pages.current
      );
      return fetchFn(paginationParams);
    },
    params
  );
  if (query.data && pages.current[currentPageNumber] !== query.data) {
    pages.current = [...pages.current];
    pages.current[currentPageNumber] = query.data;
  }

  return useMemo(() => {
    const result = {
      ...query,
      pages: pages.current.filter(Boolean),
      pageNumber: currentPageNumber,
      hasPage(pageNumber: number) {
        return !!params.getFetchPageParams(
          pageNumber,
          currentPageNumber,
          pages.current?.[currentPageNumber],
          pages.current
        );
      },
      fetchPage(pageNumber: number) {
        if (result.hasPage(pageNumber)) {
          setCurrentPageNumber(pageNumber);
        }
      },
    };
    return result;
  }, [query, currentPageNumber, pages.current]);
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
