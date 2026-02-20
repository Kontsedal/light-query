import { useQuery, UseQueryOptions } from "./useQuery";
import { useMemo, useRef, useState } from "react";
import { useValueRef } from "./utils";

export const usePagination = <T, D, P = number>(
  key: string,
  fetchFn: UsePaginationFetchFn<T, D>,
  params: UsePaginationOptions<T, D, P>
) => {
  const [currentPageId, setCurrentPageId] = useState<P>(
    (params?.defaultPageId ?? 1) as P
  );
  const currentPageKey = `${key}#[${String(currentPageId)}]`;
  const pages = useRef(new Map<P, T>());
  const prevKeyRef = useRef(key);
  if (prevKeyRef.current !== key) {
    prevKeyRef.current = key;
    pages.current = new Map();
  }
  const fetchFnRef = useValueRef(fetchFn);
  const getFetchPageParamsRef = useValueRef(params.getFetchPageParams);
  const query = useQuery(
    currentPageKey,
    async () => {
      let paginationParams = getFetchPageParamsRef.current?.(
        currentPageId,
        currentPageId,
        pages.current.get(currentPageId),
        pages.current
      );
      return fetchFnRef.current(paginationParams);
    },
    params
  );
  if (query.data && pages.current.get(currentPageId) !== query.data) {
    const newPages = new Map(pages.current);
    newPages.set(currentPageId, query.data);
    pages.current = newPages;
  }

  return useMemo(() => {
    const result = {
      ...query,
      pages: Array.from(pages.current.values()),
      pageId: currentPageId,
      hasPage(pageId: P) {
        return !!getFetchPageParamsRef.current(
          pageId,
          currentPageId,
          pages.current.get(currentPageId),
          pages.current
        );
      },
      fetchPage(pageId: P) {
        if (result.hasPage(pageId)) {
          setCurrentPageId(pageId);
        }
      },
    };
    return result;
  }, [
    query.data,
    query.error,
    query.isLoading,
    query.lastFetchedAt,
    currentPageId,
    pages.current,
    key,
  ]);
};

export type UsePaginationOptions<T, D, P = number> = UseQueryOptions<T> & {
  defaultPageId?: P;
  getFetchPageParams: (
    requestedPageId: P,
    currentPageId: P,
    currentPage: T | undefined,
    allPages: Map<P, T>
  ) => D | undefined;
};

export type UsePaginationFetchFn<T, D> = (
  paginationParams: D | undefined
) => Promise<T> | T;
