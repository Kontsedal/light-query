import { useMemo, useState } from "react";
import { useValueRef } from "./utils";
export const useMutation = <T = any, D = any>(
  mutationFn: (vars: T) => Promise<D> | D
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | undefined>();
  const mutateRef = useValueRef(mutationFn);
  const mutate = async (vars: T = "" as any, throwError = false) => {
    setIsLoading(true);
    setError(undefined);
    try {
      return await mutateRef.current(vars);
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
