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

// React escapes these in prerendered text and attributes.
export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** The share of a PNG screenshot that differs visibly from its top-left pixel: how much of the frame an object on a plain background covers. */
export function coverage(page: Page, png: Buffer) {
  return page.evaluate(async (base64) => {
    const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("no 2D context to decode the screenshot");
    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
    const [r = 0, g = 0, b = 0] = pixels;
    let covered = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const delta = Math.max(
        Math.abs((pixels[i] ?? 0) - r),
        Math.abs((pixels[i + 1] ?? 0) - g),
        Math.abs((pixels[i + 2] ?? 0) - b),
      );
      if (delta > 24) covered++;
    }
    return covered / (pixels.length / 4);
  }, png.toString("base64"));
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
