import { expect, test } from "@playwright/test";

import { MANUALES } from "../app/catalog/catalog";
import { errorsOn, escapeHtml } from "./browser";

test("the home page is prerendered with a link to every Manual, named by its title", async ({
  request,
}) => {
  const html = await (await request.get("/")).text();

  for (const manual of MANUALES) {
    const link = new RegExp(
      `<a[^>]*href="/manuales/${manual.slug}"[^>]*>`,
    ).exec(html)?.[0];
    expect(link, manual.slug).toContain(
      `aria-label="${escapeHtml(manual.title)}"`,
    );
  }
});

test("a visitor opens the home, taps a Manual in la Pila and lands on its page", async ({
  page,
}) => {
  await page.goto("/");
  const pila = page.getByRole("list", { name: "La Pila" });
  await expect(pila.getByRole("link")).toHaveCount(MANUALES.length);

  await pila
    .getByRole("link", { name: "Estadística inferencial desde cero" })
    .click();

  await expect(page).toHaveURL("/manuales/estadistica-inferencial-desde-cero");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Estadística inferencial desde cero",
  );
  expect(await errorsOn(page)).toEqual([]);
});

test("la Pila follows the catalog order", async ({ page }) => {
  await page.goto("/");
  const names = await page
    .getByRole("list", { name: "La Pila" })
    .getByRole("link")
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute("aria-label")),
    );

  expect(names.slice(0, 2)).toEqual([
    "Estadística descriptiva desde cero",
    "Probabilidad y distribuciones de probabilidad desde cero",
  ]);
  expect(names.at(-1)).toBe("Estadística aplicada al trabajo social");
});

test("every Manual in la Pila is reachable by keyboard", async ({ page }) => {
  await page.goto("/");
  const first = page
    .getByRole("list", { name: "La Pila" })
    .getByRole("link")
    .first();

  await page.keyboard.press("Tab");
  await expect(first).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/manuales/estadistica-descriptiva-desde-cero");
});

test("every book in la Pila is a 44 px touch target, and nothing scrolls sideways at 320", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/");

  const heights = await page
    .getByRole("list", { name: "La Pila" })
    .getByRole("link")
    .evaluateAll((links) =>
      links.map((link) => link.getBoundingClientRect().height),
    );
  expect(Math.min(...heights)).toBeGreaterThanOrEqual(44);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(0);
});
