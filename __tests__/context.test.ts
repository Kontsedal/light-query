import { renderHook } from "@testing-library/react";
import React, { type ReactNode, useMemo } from "react";
import { globalCache } from "../lib/cache";
import { CacheContext, useCache } from "../lib/context";

describe("context", () => {
  describe("useCache", () => {
    it("should return global cache from context", () => {
      const { result } = renderHook(() => useCache());
      expect(result.current).toBe(globalCache);
    });

    it("should return custom cache from provider", () => {
      const { result } = renderHook(() => useCache(), {
        wrapper: ({ children }: { children: ReactNode }) => {
          const customCache = useMemo(() => {
            return {
              d: {},
              l: {},
              init: () => ({}),
              get: () => ({}),
              set: () => {},
              sub: () => () => {},
              fetch: async () => ({}),
              invalidate: () => {},
              toggleGc: () => {},
            };
          }, []);
          return React.createElement(
            CacheContext.Provider,
            { value: customCache as unknown as typeof globalCache },
            children,
          );
        },
      });
      expect(result.current).not.toBe(globalCache);
    });
  });
});
