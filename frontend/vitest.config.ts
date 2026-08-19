import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["__tests__/**/*.test.ts", "__tests__/**/*.test.tsx"],
    environmentMatchGlobs: [
      ["__tests__/components/**", "jsdom"],
      ["__tests__/hooks/**", "jsdom"],
    ],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
