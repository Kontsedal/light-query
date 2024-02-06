import { useEffect, useMemo, useState } from 'react';

export type UseQueryParams<T> = {
  key: (string | number)[];
  getter: () => Promise<T> | T;
};
export const useQuery = <E, T>(params: UseQueryParams<T>) => {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    setIsLoading(true);
    setError(undefined);
    (async () => {
      try {
        const result = await params.getter();
        setData(result);
      } catch (e) {
        setError(e as Error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);
  return useMemo(
    () => ({
      data,
      isLoading,
      error,
    }),
    [data, isLoading, error, params]
  );
};
