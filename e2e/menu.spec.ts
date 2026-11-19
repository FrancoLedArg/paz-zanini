import { expect, type Page, test } from "@playwright/test";

import { MANUALES } from "../app/catalog/catalog";
import { LOADER_SEEN } from "../app/loader/loader";
import {
  block3d,
  errorsOn,
  layoutShift,
  scrollToStep,
  shown3d,
  sideways,
  tapBook,
  track,
  trackLinks,
} from "./browser";

// The first-visit cover has its own spec (loader.spec.ts).
test.beforeEach(async ({ context }) => {
  await context.addInitScript((key) => {
    try {
      sessionStorage.setItem(key, "1");
    } catch {
      // A document without storage of its own has nothing to skip.
    }
  }, LOADER_SEEN);
});

const menuButton = (page: Page) => page.getByRole("button", { name: "Índice" });
const menu = (page: Page) => page.getByRole("dialog", { name: "Índice" });
const titlesOf = (coleccion: string) =>
  MANUALES.filter((manual) => manual.coleccion === coleccion).map(
    (manual) => manual.title,
  );
const trackTitles = (page: Page) =>
  trackLinks(page).evaluateAll((links) =>
    links.map((link) => link.getAttribute("aria-label")),
  );
const words = (page: Page) =>
  page.getByRole("region", { name: "Manual en foco" });

/** Opens the menu (retried until the page has hydrated and the button works) and follows a Colección. */
async function pick(page: Page, name: string) {
  await expect(async () => {
    await menuButton(page).click();
    await expect(menu(page)).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await menu(page)
    .getByRole("link", { name: new RegExp(`^${name}`) })
    .click();
}

test("the menu opens and closes by tap, and by keyboard, with Escape returning focus to its button", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await menuButton(page).click();
  await expect(menu(page)).toBeVisible();
  await expect(menuButton(page)).toHaveAttribute("aria-expanded", "true");
  await menu(page).getByRole("button", { name: "Cerrar" }).click();
  await expect(menu(page)).toBeHidden();

  await menuButton(page).focus();
  await page.keyboard.press("Enter");
  await expect(menu(page)).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(menu(page).locator(":focus")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(menu(page)).toBeHidden();
  await expect(menuButton(page)).toBeFocused();
  await expect(menuButton(page)).toHaveAttribute("aria-expanded", "false");
});

test("picking a Colección shows only its Manuales in catalog order and puts it in the URL; Back undoes it", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await pick(page, "Estadística aplicada");
  await expect(page).toHaveURL("/?coleccion=estadistica-aplicada");
  await expect
    .poll(() => trackTitles(page))
    .toEqual(titlesOf("estadistica-aplicada"));
  await menuButton(page).click();
  await expect(
    menu(page).getByRole("link", { name: /^Estadística aplicada/ }),
  ).toHaveAttribute("aria-current", "true");
  await page.keyboard.press("Escape");

  await page.goBack();
  await expect(page).toHaveURL("/");
  await expect
    .poll(() => trackTitles(page))
    .toEqual(MANUALES.map((manual) => manual.title));
});

test("a ?coleccion= URL shows that Colección; an unknown one shows every Manual", async ({
  page,
}) => {
  await page.goto("/?coleccion=ciencia-de-datos-desde-cero");
  await expect
    .poll(() => trackTitles(page))
    .toEqual(titlesOf("ciencia-de-datos-desde-cero"));

  await page.goto("/?coleccion=no-existe");
  await page.waitForLoadState("networkidle");
  await expect
    .poll(() => trackTitles(page))
    .toEqual(MANUALES.map((manual) => manual.title));
});

test("opening a Manual from a filtered Hélice and going Back lands on the same Colección", async ({
  page,
}) => {
  await page.goto("/?coleccion=estadistica-desde-cero");
  const titles = titlesOf("estadistica-desde-cero");
  await expect.poll(() => trackTitles(page)).toEqual(titles);

  await trackLinks(page).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    titles[0] ?? "",
  );
  await page.goBack();
  await expect(page).toHaveURL("/?coleccion=estadistica-desde-cero");
  await expect.poll(() => trackTitles(page)).toEqual(titles);
});

test("the words and the 3D Hélice follow the filtered track, and its first and last books centre", async ({
  page,
}) => {
  await page.goto("/?coleccion=ciencia-de-datos-desde-cero");
  await shown3d(page);
  const titles = titlesOf("ciencia-de-datos-desde-cero");
  await expect.poll(() => trackTitles(page)).toEqual(titles);
  const steps = track(page).getByRole("listitem");
  const offCentre = (index: number) =>
    steps.nth(index).evaluate((li) => {
      const box = li.getBoundingClientRect();
      return Math.abs(box.top + box.height / 2 - innerHeight / 2);
    });

  await expect(words(page).getByRole("link")).toHaveAccessibleName(
    titles[0] ?? "",
  );
  expect(await offCentre(0)).toBeLessThan(2);
  await scrollToStep(steps.last());
  expect(await offCentre(titles.length - 1)).toBeLessThan(2);
  await expect(words(page).getByRole("link")).toHaveAccessibleName(
    titles.at(-1) ?? "",
  );

  // Over the 3D Hélice a tap lands on the canvas: it opens the right Manual only if the scene holds the same books.
  await tapBook(trackLinks(page).last());
  const last = MANUALES.filter(
    (manual) => manual.coleccion === "ciencia-de-datos-desde-cero",
  ).at(-1);
  await expect(page).toHaveURL(`/manuales/${last?.slug}`);
  expect(await errorsOn(page)).toEqual([]);
});

test("a filtered set's last book snaps to the centre as the scroll comes to rest at its end", async ({
  page,
}) => {
  await page.goto("/?coleccion=estadistica-desde-cero");
  await page.waitForLoadState("networkidle");
  const steps = track(page).getByRole("listitem");
  await expect(steps).toHaveCount(titlesOf("estadistica-desde-cero").length);

  await page.mouse.move(100, 100);
  for (let i = 0; i < 12; i++) await page.mouse.wheel(0, 500);
  await expect(async () => {
    const offCentre = await steps.last().evaluate((li) => {
      const box = li.getBoundingClientRect();
      return Math.abs(box.top + box.height / 2 - innerHeight / 2);
    });
    expect(offCentre).toBeLessThan(2);
  }).toPass({ timeout: 3_000 });
});

test("a shared ?coleccion= link doesn't shift as it narrows the track and the 3D arrives", async ({
  page,
}) => {
  await page.goto("/?coleccion=estadistica-aplicada");
  await shown3d(page);

  expect(await layoutShift(page)).toBeLessThan(0.1);
});

test("choosing the page you are on closes the menu", async ({ page }) => {
  await page.goto("/autor");
  await page.waitForLoadState("networkidle");

  await menuButton(page).click();
  await menu(page).getByRole("link", { name: "Sobre el Autor" }).click();
  await expect(menu(page)).toBeHidden();
});

test.describe("under reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the filter works on the flat track", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("canvas")).toHaveCount(0);

    await pick(page, "Ciencia de datos desde cero");
    await expect
      .poll(() => trackTitles(page))
      .toEqual(titlesOf("ciencia-de-datos-desde-cero"));
    await trackLinks(page).first().click();
    await expect(page).toHaveURL(
      "/manuales/guia-para-un-buen-analisis-de-datos",
    );
  });
});

test("without the 3D, the filter works on the flat track", async ({ page }) => {
  await block3d(page);
  // The blocked 3D chunk never settles, so the page never goes network-idle: pick() waits for hydration instead.
  await page.goto("/");

  await pick(page, "Estadística desde cero");
  await expect
    .poll(() => trackTitles(page))
    .toEqual(titlesOf("estadistica-desde-cero"));
  await expect(page.locator("canvas")).toHaveCount(0);
});

for (const path of [
  "/",
  "/manuales/estadistica-inferencial-desde-cero",
  "/autor",
  "/archivo",
  "/contacto",
]) {
  test(`the menu on ${path} links each page, and nothing scrolls sideways at 320`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    expect(await sideways(page)).toBeLessThanOrEqual(0);

    for (const [name, url] of [
      ["Sobre el Autor", "/autor"],
      ["Sobre el archivo", "/archivo"],
      ["Contacto", "/contacto"],
    ] as const) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await menuButton(page).click();
      await menu(page).getByRole("link", { name }).click();
      await expect(page).toHaveURL(url);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
    }
  });
}

test.describe("the prerendered home page, before any script runs", () => {
  test.use({ javaScriptEnabled: false });

  test("links every Manual, every Colección and the three pages", async ({
    request,
  }) => {
    const html = await (await request.get("/")).text();
    for (const manual of MANUALES)
      expect(html).toContain(`href="/manuales/${manual.slug}"`);
    for (const id of [
      "estadistica-desde-cero",
      "ciencia-de-datos-desde-cero",
      "estadistica-aplicada",
    ])
      expect(html).toContain(`href="/?coleccion=${id}"`);
    for (const path of ["/autor", "/archivo", "/contacto"])
      expect(html).toContain(`href="${path}"`);
  });
});
