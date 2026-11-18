import { expect, type Page, test } from "@playwright/test";

import { MANUALES } from "../app/catalog/catalog";

const trackLinks = (page: Page) =>
  page.getByRole("list", { name: "Manuales" }).getByRole("link");

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

test("Tab reaches every Manual in order, each brought into view", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  for (const manual of MANUALES) {
    await page.keyboard.press("Tab");
    const link = trackLinks(page).and(page.locator(":focus"));
    await expect(link).toHaveAccessibleName(manual.title);
    await expect(link).toBeInViewport({ ratio: 0.9 });
  }
});

test("scrolling settles softly on a step, with its Tapa in the middle of the screen", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // A third of the way to the next step: close enough that the track pulls it back.
  await page.mouse.move(100, 100);
  const [first, second] = await page
    .getByRole("list", { name: "Manuales" })
    .getByRole("listitem")
    .evaluateAll((steps) =>
      steps.map((step) => step.getBoundingClientRect().top),
    );
  const step = (second ?? 0) - (first ?? 0);
  await page.mouse.wheel(0, step * 2 + step / 3);

  const third = trackLinks(page).nth(2);
  await expect(async () => {
    const offCentre = await third.evaluate((link) => {
      const box = link.getBoundingClientRect();
      return Math.abs(box.top + box.height / 2 - innerHeight / 2);
    });
    expect(offCentre).toBeLessThan(2);
  }).toPass({ timeout: 3_000 });
});

for (const width of [390, 320]) {
  test(`nothing scrolls sideways at ${width}, and every Manual is a full-size tap target`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 700 });
    await page.goto("/");

    const sizes = await trackLinks(page).evaluateAll((links) =>
      links.map((link) => {
        const box = link.getBoundingClientRect();
        return Math.min(box.width, box.height);
      }),
    );
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(44);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(0);
  });
}
