import { useMemo, useState } from "react";

export type UseMutationOptions<T, D> = {
  mutationFn: (vars: T) => Promise<D> | D;
  onSuccess?: (data: D) => void;
  onError?: (error: unknown) => void;
};
export const useMutation = <T, D>(params: UseMutationOptions<T, D>) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | undefined>();
  const mutate = async (vars: T) => {
    setIsLoading(true);
    setError(undefined);
    try {
      const result = await params.mutationFn(vars);
      if (params.onSuccess) {
        params.onSuccess(result);
      }
    } catch (e) {
      setError(e);
      if (params.onError) {
        params.onError(e);
      }
    }
    setIsLoading(false);
  };
  return useMemo(() => ({ isLoading, error, mutate }), [isLoading, error]);
};
