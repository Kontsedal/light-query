import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
    },
    include: ["__tests__/**/*.test.ts"],
    clearMocks: true,
  },
});
