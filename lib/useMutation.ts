import { useMemo, useState } from "react";
export const useMutation = <T, D>(mutationFn: (vars: T) => Promise<D> | D) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | undefined>();
  const mutate = async (vars: T) => {
    setIsLoading(true);
    setError(undefined);
    try {
      return await mutationFn(vars);
    } catch (e) {
      setError(e);
    }
    setIsLoading(false);
  };
  return useMemo(() => ({ isLoading, error, mutate }), [isLoading, error]);
};
