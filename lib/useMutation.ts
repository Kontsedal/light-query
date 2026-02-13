import { useMemo, useState } from "react";
import { useValueRef } from "./utils";
export const useMutation = <T = void, D = any>(
  mutationFn: (vars: T) => Promise<D> | D
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | undefined>();
  const mutateRef = useValueRef(mutationFn);
  const mutate = async (vars?: T, throwError = false) => {
    setIsLoading(true);
    setError(undefined);
    try {
      return await mutateRef.current(vars as T);
    } catch (e) {
      setError(e);
      if (throwError) {
        throw e;
      }
    } finally {
      setIsLoading(false);
    }
  };
  return useMemo(() => ({ isLoading, error, mutate }), [isLoading, error]);
};
