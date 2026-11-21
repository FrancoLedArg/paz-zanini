import {
  type BrowserContext,
  type BrowserContextOptions,
  expect,
  type Locator,
  type Page,
} from "@playwright/test";

import { LOADER_SEEN } from "../app/loader/loader";

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

/** How far the page scrolls sideways: 0 or less when nothing does. */
export const sideways = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - innerWidth);

/** Opens a page and stops at its first frame: the HTML parsed, before any script of the page's own has run. */
export async function firstFrame(page: Page, path: string) {
  await page.goto(path, { waitUntil: "commit" });
  await page.waitForSelector("body");
}

/** The 3D chunk never arrives, as on a dropped connection. */
export const block3d = (page: Page) =>
  page.route(/\/assets\/book-[^/]+\.js$/, () => undefined);

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
  await scrollToStep(link.locator("xpath=ancestor::li[1]"));
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

/** Brings a step of the track to the middle of the screen, as a visitor's scroll settles on it. */
export async function scrollToStep(step: Locator) {
  await step.evaluate((element) => {
    element.scrollIntoView({ block: "center" });
  });
}

/** Every layout shift since navigation: a buffered observer replays them all. */
export async function layoutShift(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let total = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries())
            if ("value" in entry && typeof entry.value === "number")
              total += entry.value;
        }).observe({ type: "layout-shift", buffered: true });
        setTimeout(() => {
          resolve(total);
        }, 200);
      }),
  );
}

/** Skips the home page's first-visit cover, for journeys about the page itself (the cover has loader.spec.ts). */
export function skipLoader(context: BrowserContext) {
  return context.addInitScript((key) => {
    // Init scripts also run in documents with no storage of their own (an opaque-origin frame).
    try {
      sessionStorage.setItem(key, "1");
    } catch {
      // Nothing to skip there.
    }
  }, LOADER_SEEN);
}

/** The Colección filters at the top of every Hélice page. */
export const filters = (page: Page) =>
  page.getByRole("navigation", { name: "Colecciones" });

/** The record of the book in focus on a Hélice page. */
export const record = (page: Page) =>
  page.getByRole("region", { name: "Manual en foco" });

/** The Autor's name, the logo: in the header, or in the Hélice pages' bottom-left corner. */
export const logo = (page: Page) =>
  page.getByRole("link", { name: "Raúl E. Paz Zanini", exact: true });

/** One Colección's filter, named by the Colección's full name. */
export const filterLink = (page: Page, name: string) =>
  filters(page).getByRole("link", { name, exact: true });

/** Each element's smaller side, in px, to hold tap targets to 44. */
export const tapSizes = (elements: Locator) =>
  elements.evaluateAll((all) =>
    all.map((element) => {
      const box = element.getBoundingClientRect();
      return Math.min(box.width, box.height);
    }),
  );

/** The menu's button, and the dropdown it opens. */
export const menuButton = (page: Page) =>
  page.getByRole("button", { name: "Índice" });
export const menu = (page: Page) =>
  page.getByRole("navigation", { name: "Índice" });

/** How far a step's centre sits from the middle of the screen, in px. */
export const offCentre = (step: Locator) =>
  step.evaluate((li) => {
    const box = li.getBoundingClientRect();
    return Math.abs(box.top + box.height / 2 - innerHeight / 2);
  });

/**
 * Every step the Hélice's movement takes on `<html data-helice>` from now on ("waiting", "leaving", "arriving", "settling", then
 * null), each with the URL path and whether the first-visit cover was still up at that moment.
 */
export function recordMovement(page: Page) {
  return page.evaluateHandle(() => {
    const seen: [string | null, string, boolean][] = [];
    const html = document.documentElement;
    new MutationObserver(() => {
      seen.push([
        html.dataset.helice ?? null,
        location.pathname,
        "loader" in html.dataset,
      ]);
    }).observe(html, { attributes: true, attributeFilter: ["data-helice"] });
    return seen;
  });
}
