import { expect, type Page, test } from "@playwright/test";

import { MANUALES } from "../app/catalog/catalog";
import {
  errorsOn,
  loseWebGL,
  layoutShift,
  scrollToStep,
  shown3d,
  tapBook,
  track,
  trackLinks,
} from "./browser";

const logo = (page: Page) =>
  page.getByRole("banner").getByRole("link", { name: "Raúl E. Paz Zanini" });
const words = (page: Page) =>
  page.getByRole("region", { name: "Manual en foco" });
const LICENSE = "CC BY-NC-SA 4.0";
const licenseCount = async (page: Page) =>
  (await page.locator("body").innerText()).split(LICENSE).length - 1;

type Box = Pick<DOMRect, "top" | "bottom" | "left" | "right">;

const apart = (a: Box, b: Box) =>
  a.bottom <= b.top ||
  a.top >= b.bottom ||
  a.right <= b.left ||
  a.left >= b.right;

/** Each line of the words of the book in focus, as drawn. */
const wordLines = (page: Page) =>
  words(page)
    .locator("p")
    .evaluateAll((lines) =>
      lines.map((line) => line.getBoundingClientRect().toJSON() as Box),
    );

const step = (page: Page, index: number) =>
  track(page).getByRole("listitem").nth(index);
const inferencial = (page: Page) =>
  track(page).getByRole("link", { name: "Estadística inferencial desde cero" });

test.describe("the prerendered page, before any script runs", () => {
  test.use({ javaScriptEnabled: false });

  test("links every Manual by its title, in catalog order", async ({
    page,
  }) => {
    await page.goto("/");

    const links = await trackLinks(page).evaluateAll((elements) =>
      elements.map((link) => [
        link.getAttribute("aria-label"),
        link.getAttribute("href"),
      ]),
    );
    expect(links).toEqual(
      MANUALES.map((manual) => [manual.title, `/manuales/${manual.slug}`]),
    );
    // Catalog order, from the spec: Colección, then Recorrido step; Estadística aplicada by Campo, then Carrera.
    expect(links[0]?.[0]).toBe("Estadística descriptiva desde cero");
    expect(links.at(-1)?.[0]).toBe("Estadística aplicada al trabajo social");
  });
});

test("Tab reaches the Autor's name, then every Manual in order, each brought into view", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await page.keyboard.press("Tab");
  await expect(logo(page)).toBeFocused();
  for (const manual of MANUALES) {
    await page.keyboard.press("Tab");
    const link = trackLinks(page).and(page.locator(":focus"));
    await expect(link).toHaveAccessibleName(manual.title);
    await expect(link).toBeInViewport({ ratio: 0.9 });
  }
});

test("scrolling settles softly on a step, in the middle of the screen", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // A third of the way to the next step: close enough that the track pulls it back.
  await page.mouse.move(100, 100);
  const [first, second] = await track(page)
    .getByRole("listitem")
    .evaluateAll((steps) =>
      steps.map((step) => step.getBoundingClientRect().top),
    );
  const step = (second ?? 0) - (first ?? 0);
  await page.mouse.wheel(0, step * 2 + step / 3);

  const third = track(page).getByRole("listitem").nth(2);
  await expect(async () => {
    const offCentre = await third.evaluate((step) => {
      const box = step.getBoundingClientRect();
      return Math.abs(box.top + box.height / 2 - innerHeight / 2);
    });
    expect(offCentre).toBeLessThan(2);
  }).toPass({ timeout: 3_000 });
});

test("nothing scrolls sideways at this width or at 320, and every Manual is a full-size tap target", async ({
  page,
}) => {
  await page.goto("/");
  const sideways = () =>
    page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(await sideways()).toBeLessThanOrEqual(0);

  await page.setViewportSize({ width: 320, height: 700 });
  expect(await sideways()).toBeLessThanOrEqual(0);
  const sizes = await trackLinks(page).evaluateAll((links) =>
    links.map((link) => {
      const box = link.getBoundingClientRect();
      return Math.min(box.width, box.height);
    }),
  );
  expect(Math.min(...sizes)).toBeGreaterThanOrEqual(44);
});

test("a visitor scrolls to the last book in the 3D Hélice, taps it and lands on its Manual page", async ({
  page,
}) => {
  await page.goto("/");
  await shown3d(page);

  await tapBook(trackLinks(page).last());

  const last = MANUALES.at(-1);
  await expect(page).toHaveURL(`/manuales/${last?.slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    last?.title ?? "",
  );
  expect(await errorsOn(page)).toEqual([]);
});

test("a visitor taps a book in focus partway down the Hélice and lands on its Manual page", async ({
  page,
}) => {
  await page.goto("/");
  await shown3d(page);

  await tapBook(inferencial(page));

  await expect(page).toHaveURL("/manuales/estadistica-inferencial-desde-cero");
});

test("a modifier click on a 3D book opens its Manual in a new tab, as on a link", async ({
  page,
  context,
  isMobile,
}) => {
  test.skip(isMobile, "modifier keys: desktop");
  await page.goto("/");
  await shown3d(page);

  const opened = context.waitForEvent("page");
  await tapBook(inferencial(page), { modifiers: ["ControlOrMeta"] });

  const tab = await opened;
  await expect(tab).toHaveURL(
    /\/manuales\/estadistica-inferencial-desde-cero$/,
  );
  await expect(page).toHaveURL("/");
});

test("when the WebGL context is lost the flat track shows again, and its Tapas open their Manual pages", async ({
  page,
}) => {
  await page.goto("/");
  await shown3d(page);

  await loseWebGL(page);

  await expect(page.locator("canvas")).toHaveCount(0);
  const first = trackLinks(page).first();
  await expect(first.locator("span")).toHaveCSS("opacity", "1");
  await first.click();
  await expect(page).toHaveURL("/manuales/estadistica-descriptiva-desde-cero");
});

test.describe("under reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the flat track stays, and its Tapas open their Manual pages", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("canvas")).toHaveCount(0);
    await inferencial(page).click();
    await expect(page).toHaveURL(
      "/manuales/estadistica-inferencial-desde-cero",
    );
  });
});

test.describe("the words of the book in focus", () => {
  for (const motion of ["no-preference", "reduce"] as const) {
    test(`name the Manual on the step in view (motion: ${motion})`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: motion });
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      for (const index of [0, 5, MANUALES.length - 1]) {
        await scrollToStep(step(page, index));
        await expect(words(page).getByRole("link")).toHaveAccessibleName(
          MANUALES[index]?.title ?? "",
        );
      }
    });
  }

  test("never cover the book in focus", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    for (const [index, manual] of MANUALES.entries()) {
      await scrollToStep(step(page, index));
      await expect(words(page).getByRole("link")).toHaveAccessibleName(
        manual.title,
      );
      // The flat Tapa is where the 3D book in focus is drawn (the tap tests hold the two together).
      const book = await trackLinks(page)
        .nth(index)
        .locator("span")
        .evaluate((tapa) => tapa.getBoundingClientRect().toJSON() as Box);
      for (const line of await wordLines(page))
        expect(apart(book, line), manual.title).toBe(true);
    }
  });

  test("give the number, Colección and details of a Recorrido step and of an Estadística aplicada Manual", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await scrollToStep(step(page, 1));
    await expect(words(page)).toContainText("02");
    await expect(words(page)).toContainText("Estadística desde cero");
    await expect(words(page)).toContainText("Paso 2 · R y Python · 49 páginas");

    await scrollToStep(step(page, MANUALES.length - 1));
    await expect(words(page)).toContainText("07");
    await expect(words(page)).toContainText("Estadística aplicada");
    await expect(words(page)).toContainText(
      /^.*Trabajo Social · .+ · \d+ páginas$/m,
    );
  });

  test("open their Manual from the title", async ({ page }) => {
    await page.goto("/");
    await scrollToStep(step(page, 1));
    const title = words(page).getByRole("link");
    await expect(title).toHaveAccessibleName(MANUALES[1]?.title ?? "");
    await title.click();
    await expect(page).toHaveURL(`/manuales/${MANUALES[1]?.slug}`);
  });
});

test("the Autor's name links home from a Manual page, by keyboard too", async ({
  page,
}) => {
  await page.goto("/manuales/estadistica-inferencial-desde-cero");
  await page.waitForLoadState("networkidle");

  await page.keyboard.press("Tab");
  await expect(logo(page)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/");
});

test("the license is stated once on the home page, and the page rests on it past the last Manual", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(await licenseCount(page)).toBe(1);

  await page.mouse.move(100, 100);
  for (let i = 0; i < 40; i++) await page.mouse.wheel(0, 600);
  const license = page.getByText(LICENSE);
  await expect(license).toBeInViewport();
  // The text itself, not the room below it, is on screen and clear of the words of the last book.
  const line = await license.evaluate((paragraph) => {
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    return range.getBoundingClientRect().toJSON() as Box;
  });
  expect(line.bottom).toBeLessThanOrEqual(
    await page.evaluate(() => innerHeight),
  );
  for (const text of await wordLines(page))
    expect(apart(line, text)).toBe(true);
});

test("the license is stated once on a Manual page", async ({ page }) => {
  await page.goto("/manuales/estadistica-inferencial-desde-cero");
  expect(await licenseCount(page)).toBe(1);
});

test("nothing shifts as the home page hydrates and the 3D arrives", async ({
  page,
}) => {
  await page.goto("/");
  await shown3d(page);

  const shift = await layoutShift(page);
  expect(shift).toBeLessThan(0.1);
});
