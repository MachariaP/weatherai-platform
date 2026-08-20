import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    include: ["__tests__/**/*.test.ts", "__tests__/**/*.test.tsx"],
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 8_000,
    hookTimeout: 8_000,
    pool: "threads",
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
    environmentOptions: {
      jsdom: {
        url: "http://127.0.0.1:9876/",
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(dirname, "."),
    },
  },
});