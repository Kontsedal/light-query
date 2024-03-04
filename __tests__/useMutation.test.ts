import { describe, expect, it, jest } from "@jest/globals";
import { useMutation } from "../lib";
import { act, renderHook } from "@testing-library/react";
import { wait } from "./utils";

describe("useMutation", () => {
  it("should report loading state", async () => {
    const { result } = renderHook(() => useMutation(async () => wait(50)));
    await act(() => {
      result.current.mutate();
    });
    expect(result.current).toMatchObject({
      isLoading: true,
      error: undefined,
    });
  });
  it("should report error state", async () => {
    const error = new Error("error");
    const { result } = renderHook(() =>
      useMutation(async () => {
        await wait(50);
        throw error;
      })
    );
    await act(async () => {
      try {
        await result.current.mutate();
      } catch (e) {}
    });
    expect(result.current).toMatchObject({
      isLoading: false,
      error: error,
    });
  });

  it("should pass variables to mutation function", async () => {
    const mutationFn = jest.fn();
    const { result } = renderHook(() => useMutation(mutationFn));
    await act(async () => {
      await result.current.mutate("vars");
    });
    expect(mutationFn).toHaveBeenCalledWith("vars");
  });

  it("should use latest mutation function", async () => {
    const mutationFn = jest.fn();
    const { result, rerender } = renderHook(
      (mutationFn) => useMutation(mutationFn),
      {
        initialProps: mutationFn,
      }
    );
    const newMutationFn = jest.fn();
    rerender(newMutationFn);
    await act(async () => {
      await result.current.mutate();
    });
    expect(newMutationFn).toHaveBeenCalled();
    expect(mutationFn).not.toHaveBeenCalled();
  });
});
