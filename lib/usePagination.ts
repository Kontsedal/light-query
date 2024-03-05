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
  const pages = useRef<Record<string, T[]>>({
    [key]: [],
  });
  const fetchFnRef = useRef(fetchFn);
  const getFetchPageParamsRef = useRef(params.getFetchPageParams);
  const query = useQuery(
    currentPageKey,
    async () => {
      let paginationParams = getFetchPageParamsRef.current?.(
        currentPageNumber,
        currentPageNumber,
        pages.current?.[key]?.[currentPageNumber],
        pages.current?.[key] || []
      );
      return fetchFnRef.current(paginationParams);
    },
    params
  );
  if (!pages.current[key]) {
    pages.current[key] = [];
  }
  if (query.data && pages.current[key]?.[currentPageNumber] !== query.data) {
    pages.current[key] = [...(pages.current[key] as T[])];
    (pages.current[key] as T[])[currentPageNumber] = query.data;
  }

  return useMemo(() => {
    const result = {
      ...query,
      pages: (pages.current[key] as T[])?.filter(Boolean) || [],
      pageNumber: currentPageNumber,
      hasPage(pageNumber: number) {
        return !!getFetchPageParamsRef.current(
          pageNumber,
          currentPageNumber,
          pages.current[key]?.[currentPageNumber],
          pages.current[key] as T[]
        );
      },
      fetchPage(pageNumber: number) {
        if (result.hasPage(pageNumber)) {
          setCurrentPageNumber(pageNumber);
        }
      },
    };
    console.log("r", JSON.stringify(result));
    return result;
  }, [
    query.data,
    query.error,
    query.isLoading,
    query.lastFetchedAt,
    currentPageNumber,
    pages.current[key],
    key,
  ]);
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
