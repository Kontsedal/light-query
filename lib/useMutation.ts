import { useMemo, useState } from "react";
import { useValueRef } from "./utils";
export const useMutation = <T, D>(mutationFn: (vars: T) => Promise<D> | D) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | undefined>();
  const mutateRef = useValueRef(mutationFn);
  const mutate = async (vars: T) => {
    setIsLoading(true);
    setError(undefined);
    try {
      return await mutateRef.current(vars);
    } catch (e) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  };
  return useMemo(() => ({ isLoading, error, mutate }), [isLoading, error]);
};
