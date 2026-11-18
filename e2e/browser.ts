import {
  type BrowserContextOptions,
  expect,
  type Locator,
  type Page,
} from "@playwright/test";

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

/** The home page's flat track: one step per Manual. */
export const track = (page: Page) =>
  page.getByRole("list", { name: "Manuales" });

/** Every Manual on the flat track, as the links a visitor reaches. */
export const trackLinks = (page: Page) => track(page).getByRole("link");

/**
 * Taps a book in the Hélice the way a visitor does: its step scrolled to the middle of the screen, where the book in
 * focus faces them, then tapped where its link sits. Over the 3D Hélice the tap lands on the canvas, so it opens
 * whichever 3D book is drawn there: a Hélice out of step with the flat track opens the wrong Manual.
 */
export async function tapBook(
  link: Locator,
  options: Parameters<Locator["click"]>[0] = {},
) {
  await link.evaluate((element) => {
    element.closest("li")?.scrollIntoView({ block: "center" });
  });
  // The helix turns to the new focus on a spring; let it settle.
  // shortcut: a fixed 800 ms, enough on a GPU; wait on a settled signal if taps land mid-turn on slower runners.
  await link.page().waitForTimeout(800);
  // Forced: the 3D canvas covers the flat link on purpose, and takes the tap.
  await link.click({ ...options, force: true });
}

/** The 3D canvas, once its shaders are compiled and it has faded in over what stood in for it. */
export async function shown3d(page: Page) {
  await expect(page.locator('[aria-busy="false"]')).toBeAttached({
    timeout: 20_000,
  });
  return page.locator("canvas");
}

/** Loses the page's WebGL context, as a crashed or reclaimed GPU would. */
export async function loseWebGL(page: Page) {
  await page.evaluate(() => {
    const gl = document.querySelector("canvas")?.getContext("webgl2");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  });
}
