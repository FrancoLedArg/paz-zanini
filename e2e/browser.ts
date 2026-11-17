import type { BrowserContextOptions, Page } from "@playwright/test";

// The two widths every change must pass, shared by Playwright tests and `pnpm shots`.
export const VIEWPORTS = {
  phone: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
  desktop: {
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  },
} satisfies Record<string, BrowserContextOptions>;

// Console errors and uncaught exceptions the page has produced so far.
export async function errorsOn(page: Page): Promise<string[]> {
  const [messages, exceptions] = await Promise.all([
    page.consoleMessages({ filter: "all" }),
    page.pageErrors({ filter: "all" }),
  ]);
  return [
    ...messages.filter((m) => m.type() === "error").map((m) => m.text()),
    ...exceptions.map((e) => e.message),
  ];
}
