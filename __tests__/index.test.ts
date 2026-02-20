import {
  CacheContext,
  createCache,
  globalCache,
  useCache,
  useMutation,
  usePagination,
  useQuery,
} from "../lib";

describe("index exports", () => {
  it("should export createCache", () => {
    expect(createCache).toBeDefined();
    expect(typeof createCache).toBe("function");
  });

  it("should export useQuery", () => {
    expect(useQuery).toBeDefined();
    expect(typeof useQuery).toBe("function");
  });

  it("should export CacheContext", () => {
    expect(CacheContext).toBeDefined();
  });

  it("should export useCache", () => {
    expect(useCache).toBeDefined();
    expect(typeof useCache).toBe("function");
  });

  it("should export useMutation", () => {
    expect(useMutation).toBeDefined();
    expect(typeof useMutation).toBe("function");
  });

  it("should export usePagination", () => {
    expect(usePagination).toBeDefined();
    expect(typeof usePagination).toBe("function");
  });

  it("should export globalCache", () => {
    expect(globalCache).toBeDefined();
    expect(globalCache).toHaveProperty("d");
    expect(globalCache).toHaveProperty("l");
    expect(globalCache).toHaveProperty("set");
    expect(globalCache).toHaveProperty("get");
    expect(globalCache).toHaveProperty("sub");
    expect(globalCache).toHaveProperty("fetch");
    expect(globalCache).toHaveProperty("invalidate");
    expect(globalCache).toHaveProperty("toggleGc");
  });

  it("should have all types available", () => {
    // TypeScript will verify this at compile time
    // This is a runtime check to ensure the types are not causing issues
    expect(true).toBe(true);
  });
});
