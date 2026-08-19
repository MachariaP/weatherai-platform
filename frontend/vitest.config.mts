import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    include: ["__tests__/**/*.test.ts", "__tests__/**/*.test.tsx"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(dirname, "."),
    },
  },
});