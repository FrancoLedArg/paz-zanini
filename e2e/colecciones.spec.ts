import { expect, type Page, test } from "@playwright/test";

import {
  type ColeccionId,
  coleccionesWithCount,
  manualesIn,
} from "../app/catalog/catalog";
import {
  block3d,
  errorsOn,
  filters,
  layoutShift,
  menu,
  menuButton,
  offCentre,
  recordMovement,
  scrollToStep,
  shown3d,
  sideways,
  skipLoader,
  tapBook,
  track,
  trackLinks,
} from "./browser";

// The first-visit cover has its own spec (loader.spec.ts).
test.beforeEach(({ context }) => skipLoader(context));

const titlesOf = (coleccion: ColeccionId) =>
  manualesIn(coleccion).map((manual) => manual.title);
const trackTitles = (page: Page) =>
  trackLinks(page).evaluateAll((links) =>
    links.map((link) => link.getAttribute("aria-label")),
  );

/** Taps a Colección's filter, named by the Colección's full name. */
const pick = (page: Page, name: string) =>
  filters(page).getByRole("link", { name, exact: true }).click();

/** Opens the menu, retried until the page has hydrated and the button works. */
const openMenu = (page: Page) =>
  expect(async () => {
    await menuButton(page).click();
    await expect(menu(page)).toBeVisible({ timeout: 1_000 });
  }).toPass();

test("the menu opens and closes by tap, and by keyboard, with Escape returning focus to its button", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await openMenu(page);
  await page.mouse.click(10, 300);
  await expect(menu(page)).toBeHidden();

  await menuButton(page).focus();
  await page.keyboard.press("Enter");
  await expect(menu(page)).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(menu(page).getByRole("link").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu(page)).toBeHidden();
  await expect(menuButton(page)).toBeFocused();
});

test("picking a Colección goes to its page, with only its Manuales in catalog order; Back undoes it", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await pick(page, "Estadística aplicada");
  await expect(page).toHaveURL("/colecciones/estadistica-aplicada");
  await expect
    .poll(() => trackTitles(page))
    .toEqual(titlesOf("estadistica-aplicada"));

  await page.goBack();
  await expect(page).toHaveURL("/");
  await expect
    .poll(() => trackTitles(page))
    .toEqual(titlesOf("estadistica-desde-cero"));
});

test("every Hélice page shows the three Colecciones as filters from its first paint, marking its own", async ({
  page,
}) => {
  for (const { name, path } of coleccionesWithCount()) {
    await page.goto(path);
    await expect(filters(page).getByRole("link")).toHaveCount(3);
    await expect(filters(page)).toBeInViewport();
    const current = filters(page).locator('[aria-current="page"]');
    await expect(current).toHaveCount(1);
    await expect(current).toHaveAccessibleName(name);
  }
});

test("the filters stay at the top as the track scrolls, and never cover the book in focus", async ({
  page,
}) => {
  await page.goto("/colecciones/estadistica-aplicada");
  await page.waitForLoadState("networkidle");

  const steps = track(page).getByRole("listitem");
  for (const index of [0, 3, (await steps.count()) - 1]) {
    await scrollToStep(steps.nth(index));
    await expect(filters(page)).toBeInViewport();
    // The flat Tapa is where the 3D book in focus is drawn (the tap tests hold the two together).
    const [nav, tapa] = await Promise.all([
      filters(page).boundingBox(),
      trackLinks(page).nth(index).locator("span").boundingBox(),
    ]);
    expect((nav?.y ?? 0) + (nav?.height ?? 0)).toBeLessThanOrEqual(
      tapa?.y ?? 0,
    );
  }
});

test("opening a Manual from a Colección's page and going Back lands on the same Colección and the same book", async ({
  page,
}) => {
  await page.goto("/colecciones/ciencia-de-datos-desde-cero");
  await page.waitForLoadState("networkidle");
  const titles = titlesOf("ciencia-de-datos-desde-cero");
  const third = track(page).getByRole("listitem").nth(2);
  await scrollToStep(third);

  await trackLinks(page).nth(2).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    titles[2] ?? "",
  );
  await page.goBack();
  await expect(page).toHaveURL("/colecciones/ciencia-de-datos-desde-cero");
  await expect.poll(() => trackTitles(page)).toEqual(titles);
  await expect.poll(() => offCentre(third)).toBeLessThan(2);
});

test("on a Colección's page the 3D Hélice follows its track, and its first and last books centre", async ({
  page,
}) => {
  await page.goto("/colecciones/ciencia-de-datos-desde-cero");
  await shown3d(page);
  const titles = titlesOf("ciencia-de-datos-desde-cero");
  await expect.poll(() => trackTitles(page)).toEqual(titles);
  const steps = track(page).getByRole("listitem");

  expect(await offCentre(steps.first())).toBeLessThan(2);
  await scrollToStep(steps.last());
  expect(await offCentre(steps.last())).toBeLessThan(2);

  // Over the 3D Hélice a tap lands on the canvas: it opens the right Manual only if the scene holds the same books.
  await tapBook(trackLinks(page).last());
  const last = manualesIn("ciencia-de-datos-desde-cero").at(-1);
  await expect(page).toHaveURL(`/manuales/${last?.slug}`);
  expect(await errorsOn(page)).toEqual([]);
});

test("changing Colección keeps the same 3D canvas and swaps its books in place, so a tap opens the right Manual", async ({
  page,
}) => {
  await page.goto("/");
  const canvas = await (await shown3d(page)).elementHandle();

  await pick(page, "Estadística aplicada");
  await expect
    .poll(() => trackTitles(page))
    .toEqual(titlesOf("estadistica-aplicada"));
  expect(await canvas.evaluate((element) => element.isConnected)).toBe(true);
  await expect(page.locator("canvas")).toHaveCount(1);
  await tapBook(trackLinks(page).nth(2));
  await expect(page).toHaveURL(
    `/manuales/${manualesIn("estadistica-aplicada")[2]?.slug}`,
  );
  expect(await errorsOn(page)).toEqual([]);
});

/** The movement of one Colección change, without the cover flag: leaving from `from`, arriving and settling at `to`. */
const change = (from: string, to: string) => [
  ["leaving", from],
  ["arriving", to],
  ["settling", to],
  [null, to],
];
const steps = (seen: [string | null, string, boolean][]) =>
  seen.map(([step, path]) => [step, path]);

test("a Colección picked from the filters: the books leave at once, the next Colección's arrive, and the page ends on its first book", async ({
  page,
}) => {
  await page.goto("/");
  await shown3d(page);
  const seen = await recordMovement(page);

  await pick(page, "Ciencia de datos desde cero");
  // The books leave before the URL changes, so the whole movement is seen on the page it starts from.
  await expect
    .poll(async () => steps(await seen.jsonValue()), { timeout: 10_000 })
    .toEqual(change("/", "/colecciones/ciencia-de-datos-desde-cero"));

  expect(await trackTitles(page)).toEqual(
    titlesOf("ciencia-de-datos-desde-cero"),
  );
  await expect(
    filters(page).getByRole("link", { name: "Ciencia de datos desde cero" }),
  ).toHaveAttribute("aria-current", "page");
  expect(
    await offCentre(track(page).getByRole("listitem").first()),
  ).toBeLessThan(2);
  expect(await errorsOn(page)).toEqual([]);
});

for (const during of ["leaving", "arriving"] as const)
  test(`picking again while the books are ${during} ends on the last pick, with no stray books`, async ({
    page,
  }) => {
    await page.goto("/");
    await shown3d(page);
    const seen = await recordMovement(page);

    await pick(page, "Ciencia de datos desde cero");
    await expect
      .poll(async () =>
        (await seen.jsonValue()).some(([step]) => step === during),
      )
      .toBe(true);
    await pick(page, "Estadística aplicada");

    await expect(page).toHaveURL("/colecciones/estadistica-aplicada");
    await expect
      .poll(async () => (await seen.jsonValue()).at(-1), { timeout: 10_000 })
      .toEqual([null, "/colecciones/estadistica-aplicada", false]);
    expect(await trackTitles(page)).toEqual(titlesOf("estadistica-aplicada"));
    await expect(page.locator("canvas")).toHaveCount(1);
    // The book in focus is the new Colección's first, and a tap on it opens that Manual.
    await tapBook(trackLinks(page).first());
    await expect(page).toHaveURL(
      `/manuales/${manualesIn("estadistica-aplicada")[0]?.slug}`,
    );
  });

test("picking the Colección you are on while the books leave brings them back", async ({
  page,
}) => {
  await page.goto("/");
  await shown3d(page);
  const seen = await recordMovement(page);

  await pick(page, "Ciencia de datos desde cero");
  await expect
    .poll(async () => (await seen.jsonValue()).length)
    .toBeGreaterThan(0);
  await pick(page, "Estadística desde cero");

  await expect
    .poll(async () => (await seen.jsonValue()).at(-1), { timeout: 10_000 })
    .toEqual([null, "/", false]);
  await expect(page).toHaveURL("/");
  expect(await trackTitles(page)).toEqual(titlesOf("estadistica-desde-cero"));
});

test("a Manual opened while the books leave stays open: the change is dropped", async ({
  page,
}) => {
  await page.goto("/");
  await shown3d(page);
  const seen = await recordMovement(page);

  await pick(page, "Ciencia de datos desde cero");
  await expect
    .poll(async () => (await seen.jsonValue()).length)
    .toBeGreaterThan(0);
  // A link followed in the page (the flat track's first Tapa), as a tap would.
  await trackLinks(page)
    .first()
    .evaluate((link) => {
      (link as HTMLElement).click();
    });
  const manual = `/manuales/${manualesIn("estadistica-desde-cero")[0]?.slug}`;
  await expect(page).toHaveURL(manual);
  // Nothing pulls the visitor on to the Colección they had picked.
  await page.waitForTimeout(1500);
  await expect(page).toHaveURL(manual);
});

test("a Colección's last book snaps to the centre as the scroll comes to rest at its end", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const steps = track(page).getByRole("listitem");
  await expect(steps).toHaveCount(titlesOf("estadistica-desde-cero").length);

  await page.mouse.move(100, 100);
  for (let i = 0; i < 12; i++) await page.mouse.wheel(0, 500);
  await expect(async () => {
    expect(await offCentre(steps.last())).toBeLessThan(2);
  }).toPass({ timeout: 3_000 });
});

test("a Colección's page doesn't shift as it hydrates and the 3D arrives", async ({
  page,
}) => {
  await page.goto("/colecciones/estadistica-aplicada");
  await shown3d(page);

  expect(await layoutShift(page)).toBeLessThan(0.1);
});

test("choosing the page you are on closes the menu", async ({ page }) => {
  await page.goto("/autor");
  await page.waitForLoadState("networkidle");

  await openMenu(page);
  await menu(page).getByRole("link", { name: "Sobre el Autor" }).click();
  await expect(menu(page)).toBeHidden();
});

test.describe("under reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("moving between Colecciones works on the flat track", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("canvas")).toHaveCount(0);
    const seen = await recordMovement(page);

    await pick(page, "Ciencia de datos desde cero");
    await expect
      .poll(() => trackTitles(page))
      .toEqual(titlesOf("ciencia-de-datos-desde-cero"));
    await pick(page, "Estadística aplicada");
    await expect
      .poll(() => trackTitles(page))
      .toEqual(titlesOf("estadistica-aplicada"));
    await trackLinks(page).first().click();
    await expect(page).toHaveURL("/manuales/estadistica-aplicada-obstetricia");
    expect(await seen.jsonValue()).toEqual([]);
  });
});

test("without the 3D, moving between Colecciones works on the flat track", async ({
  page,
}) => {
  await block3d(page);
  // The blocked 3D chunk never settles, so the page never goes network-idle. Before hydration a filter is a plain link.
  await page.goto("/colecciones/estadistica-aplicada");

  await pick(page, "Estadística desde cero");
  await expect(page).toHaveURL("/");
  await expect
    .poll(() => trackTitles(page))
    .toEqual(titlesOf("estadistica-desde-cero"));
  await pick(page, "Ciencia de datos desde cero");
  await expect
    .poll(() => trackTitles(page))
    .toEqual(titlesOf("ciencia-de-datos-desde-cero"));
  await expect(page.locator("canvas")).toHaveCount(0);
});

for (const path of [
  ...coleccionesWithCount().map(({ path }) => path),
  "/manuales/estadistica-inferencial-desde-cero",
  "/autor",
  "/archivo",
  "/contacto",
]) {
  test(`the menu on ${path} links each page, the filters show on Hélice pages only, and nothing scrolls sideways at 320`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    expect(await sideways(page)).toBeLessThanOrEqual(0);
    if (coleccionesWithCount().some((coleccion) => coleccion.path === path)) {
      const sizes = await filters(page)
        .getByRole("link")
        .evaluateAll((links) =>
          links.map((link) => {
            const box = link.getBoundingClientRect();
            return Math.min(box.width, box.height);
          }),
        );
      expect(Math.min(...sizes)).toBeGreaterThanOrEqual(44);
    } else await expect(filters(page)).toHaveCount(0);

    for (const [name, url] of [
      ["Sobre el Autor", "/autor"],
      ["Sobre el archivo", "/archivo"],
      ["Contacto", "/contacto"],
    ] as const) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await openMenu(page);
      await menu(page).getByRole("link", { name }).click();
      await expect(page).toHaveURL(url);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
    }
  });
}

test.describe("the prerendered home page, before any script runs", () => {
  test.use({ javaScriptEnabled: false });

  test("links its Manuales, every Colección's page and the three pages", async ({
    request,
  }) => {
    const html = await (await request.get("/")).text();
    for (const manual of manualesIn("estadistica-desde-cero"))
      expect(html).toContain(`href="/manuales/${manual.slug}"`);
    for (const path of [
      ...coleccionesWithCount().map(({ path }) => path),
      "/autor",
      "/archivo",
      "/contacto",
    ])
      expect(html).toContain(`href="${path}"`);
  });
});
