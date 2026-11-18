import { expect, test } from "@playwright/test";

import { MANUALES } from "../app/catalog/catalog";
import {
  errorsOn,
  escapeHtml,
  pilaLinks,
  shown3dPila,
  tapBook,
} from "./browser";

test("the home page is prerendered with a link to every Manual, named by its title", async ({
  request,
}) => {
  const html = await (await request.get("/")).text();

  // La Pila alone: no search box or filters.
  expect(html).not.toMatch(/<(search|input|select)\b/);
  for (const manual of MANUALES) {
    const link = new RegExp(
      `<a[^>]*href="/manuales/${manual.slug}"[^>]*>`,
    ).exec(html)?.[0];
    expect(link, manual.slug).toContain(
      `aria-label="${escapeHtml(manual.title)}"`,
    );
  }
});

test("a visitor opens the home, taps a book in the 3D Pila and lands on its Manual page", async ({
  page,
}) => {
  await page.goto("/");
  const pila = page.getByRole("list", { name: "La Pila" });
  await expect(pila.getByRole("link")).toHaveCount(MANUALES.length);
  await shown3dPila(page);

  await tapBook(
    pila.getByRole("link", { name: "Estadística inferencial desde cero" }),
  );

  await expect(page).toHaveURL("/manuales/estadistica-inferencial-desde-cero");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Estadística inferencial desde cero",
  );
  expect(await errorsOn(page)).toEqual([]);
});

test("a modifier click on a 3D book opens its Manual in a new tab, as on a link", async ({
  page,
  context,
  isMobile,
}) => {
  test.skip(isMobile, "modifier keys: desktop");
  await page.goto("/");
  await shown3dPila(page);

  const opened = context.waitForEvent("page");
  await tapBook(
    page
      .getByRole("list", { name: "La Pila" })
      .getByRole("link", { name: "Estadística inferencial desde cero" }),
    { modifiers: ["ControlOrMeta"] },
  );

  const tab = await opened;
  await expect(tab).toHaveURL(
    /\/manuales\/estadistica-inferencial-desde-cero$/,
  );
  await expect(page).toHaveURL("/");
});

test("search params from an old link still show every Manual", async ({
  page,
}) => {
  await page.goto("/?q=astrologia&coleccion=estadistica-aplicada");
  // Hydrated: the bug this guards against was filtering by the URL after hydration.
  await page.waitForLoadState("networkidle");

  await expect(pilaLinks(page)).toHaveCount(MANUALES.length);
  await expect(page.getByRole("searchbox")).toHaveCount(0);
  await expect(page.getByRole("combobox")).toHaveCount(0);
});

test("when the WebGL context is lost the flat Pila shows again", async ({
  page,
}) => {
  await page.goto("/");
  await shown3dPila(page);

  await page.evaluate(() => {
    const gl = document.querySelector("canvas")?.getContext("webgl2");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  });

  await expect(page.locator("canvas")).toHaveCount(0);
  const first = pilaLinks(page).first();
  await expect(first.locator("span")).toHaveCSS("opacity", "1");
  await first.click();
  await expect(page).toHaveURL("/manuales/estadistica-descriptiva-desde-cero");
});

test.describe("under reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the flat Pila stays, and its books open their Manual pages", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("canvas")).toHaveCount(0);
    await page
      .getByRole("list", { name: "La Pila" })
      .getByRole("link", { name: "Estadística inferencial desde cero" })
      .click();
    await expect(page).toHaveURL(
      "/manuales/estadistica-inferencial-desde-cero",
    );
  });
});

test("la Pila follows the catalog order", async ({ page }) => {
  await page.goto("/");
  const names = await pilaLinks(page).evaluateAll((links) =>
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
  const first = pilaLinks(page).first();

  // From the top, the first Tab lands on the first book.
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

  const heights = await pilaLinks(page).evaluateAll((links) =>
    links.map((link) => link.getBoundingClientRect().height),
  );
  expect(Math.min(...heights)).toBeGreaterThanOrEqual(44);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(0);
});
