import { defineConfig } from "@playwright/test";

import { GPU_ARGS, VIEWPORTS } from "./e2e/browser";

const PORT = 4173;

// Tests run against the prerendered production build, at the two widths every change must pass.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    launchOptions: { args: GPU_ARGS },
  },
  projects: Object.entries(VIEWPORTS).map(([name, use]) => ({ name, use })),
  webServer: {
    command: `pnpm build && pnpm preview --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
