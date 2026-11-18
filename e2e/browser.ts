import { type BrowserContextOptions, type Page } from "@playwright/test";

// Headless Chromium otherwise falls back to software WebGL: it misjudges materials and lighting, and draws a 3D frame
// so slowly that a tap lands before the scene has caught up with a scroll.
// shortcut: ANGLE Metal exists only on macOS, pass a platform backend (e.g. --use-angle=vulkan) when running elsewhere.
export const GPU_ARGS = [
  "--ignore-gpu-blocklist",
  "--enable-gpu",
  "--use-angle=metal",
];

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

// React escapes these in prerendered text and attributes.
export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

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
