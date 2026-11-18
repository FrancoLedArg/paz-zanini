import {
  type BrowserContextOptions,
  expect,
  type Locator,
  type Page,
} from "@playwright/test";

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

/**
 * Taps a book in la Pila the way a visitor does: brought to the centre of the screen, where the book in focus sits,
 * then tapped where it shows. Over the 3D Pila the tap lands on the canvas, so it opens whichever 3D book is drawn
 * there: a stack out of step with the flat Pila opens the wrong Manual.
 */
export async function tapBook(link: Locator) {
  await link.evaluate((element) => {
    element.scrollIntoView({ block: "center" });
  });
  // The book in focus slides out on a spring; let it settle.
  await link.page().waitForTimeout(800);
  // Forced: the 3D canvas covers the flat link on purpose, and takes the tap.
  await link.click({ force: true });
}

/** The 3D Pila, once compiled and faded in over the flat one. */
export async function shown3dPila(page: Page) {
  await expect(page.locator('.pila-3d[aria-busy="false"]')).toBeAttached({
    timeout: 20_000,
  });
}
