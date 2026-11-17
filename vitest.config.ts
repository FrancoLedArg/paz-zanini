import { defineConfig } from "vitest/config";

// Separate from vite.config.ts: the React Router plugin must not run under Vitest.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    include: ["app/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
