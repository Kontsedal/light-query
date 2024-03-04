import { useEffect, useMemo, useRef, useState } from "react";
export const useMutation = <T, D>(mutationFn: (vars?: T) => Promise<D> | D) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | undefined>();
  const mutateRef = useRef(mutationFn);
  useEffect(() => {
    mutateRef.current = mutationFn;
  }, [mutationFn]);
  const mutate = async (vars?: T) => {
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
