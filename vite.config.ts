import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              // React and React Router in one chunk, which every page loads anyway: one gzip stream instead of five
              // saves 3.2 KiB of first-paint JS (#83). react-dom/server stays with the 3D chunk that draws covers.
              name: "framework",
              test: (id) =>
                /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/.test(
                  id,
                ) && !id.includes("server"),
            },
          ],
        },
      },
    },
  },
  // The React Router plugin must not run under Vitest.
  plugins: [tailwindcss(), !process.env.VITEST && reactRouter()],
  test: {
    environment: "jsdom",
    exclude: [...configDefaults.exclude, "e2e/**", ".agents/**", ".claude/**"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
