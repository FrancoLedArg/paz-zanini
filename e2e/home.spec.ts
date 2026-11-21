import { expect, type Page, test } from "@playwright/test";

import {
  coleccionesWithCount,
  manualesIn,
  manualPath,
} from "../app/catalog/catalog";
import {
  errorsOn,
  filterLink,
  loseWebGL,
  layoutShift,
  menuButton,
  offCentre,
  scrollToStep,
  shown3d,
  sideways,
  skipLoader,
  tapBook,
  tapSizes,
  track,
  trackLinks,
} from "./browser";

// These journeys are the page itself; the first-visit cover has its own spec (loader.spec.ts).
test.beforeEach(({ context }) => skipLoader(context));

// The home page is Colección I's Hélice.
const HOME_MANUALES = manualesIn("estadistica-desde-cero");

const logo = (page: Page) =>
  page.getByRole("banner").getByRole("link", { name: "Raúl E. Paz Zanini" });
const LICENSE = "CC BY-NC-SA 4.0";
const licenseCount = async (page: Page) =>
  (await page.locator("body").innerText()).split(LICENSE).length - 1;

const step = (page: Page, index: number) =>
  track(page).getByRole("listitem").nth(index);
const inferencial = (page: Page) =>
  track(page).getByRole("link", { name: "Estadística inferencial desde cero" });

test.describe("the prerendered page, before any script runs", () => {
  test.use({ javaScriptEnabled: false });

  for (const { id, name, path, count } of coleccionesWithCount())
    test(`${path} links only ${name}'s Manuales by their titles, in catalog order, under its own title`, async ({
      page,
    }) => {
      await page.goto(path);

      const links = await trackLinks(page).evaluateAll((elements) =>
        elements.map((link) => [
          link.getAttribute("aria-label"),
          link.getAttribute("href"),
        ]),
      );
      expect(links).toEqual(
        manualesIn(id).map((manual) => [manual.title, manualPath(manual)]),
      );
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
      await expect(page).toHaveTitle(`${name} · Raúl E. Paz Zanini`);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        "content",
        `${name}: ${count} Manuales gratuitos de Raúl E. Paz Zanini.`,
      );
    });
});

test("Tab reaches the Autor's name, the menu, the three Colecciones, then every Manual in order, each brought into view", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await page.keyboard.press("Tab");
  await expect(logo(page)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(menuButton(page)).toBeFocused();
  for (const { name } of coleccionesWithCount()) {
    await page.keyboard.press("Tab");
    await expect(filterLink(page, name)).toBeFocused();
  }
  for (const manual of HOME_MANUALES) {
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

  // A quarter of the way to the next step: close enough that the track pulls it back (a step is a whole screen).
  await page.mouse.move(100, 100);
  const [first, second] = await track(page)
    .getByRole("listitem")
    .evaluateAll((steps) =>
      steps.map((step) => step.getBoundingClientRect().top),
    );
  const height = (second ?? 0) - (first ?? 0);
  await page.mouse.wheel(0, height * 2 + height / 4);

  await expect(async () => {
    expect(await offCentre(step(page, 2))).toBeLessThan(2);
  }).toPass({ timeout: 3_000 });
});

test("the first and last books centre on the screen", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const last = step(page, HOME_MANUALES.length - 1);

  expect(await offCentre(step(page, 0))).toBeLessThan(2);
  await scrollToStep(last);
  expect(await offCentre(last)).toBeLessThan(2);
});

test("nothing scrolls sideways at this width or at 320, and every Manual is a full-size tap target", async ({
  page,
}) => {
  await page.goto("/");
  expect(await sideways(page)).toBeLessThanOrEqual(0);

  await page.setViewportSize({ width: 320, height: 700 });
  expect(await sideways(page)).toBeLessThanOrEqual(0);
  const sizes = await tapSizes(trackLinks(page));
  expect(Math.min(...sizes)).toBeGreaterThanOrEqual(44);
});

test("a visitor scrolls to the last book in the 3D Hélice, taps it and lands on its Manual page", async ({
  page,
}) => {
  await page.goto("/");
  await shown3d(page);

  await tapBook(trackLinks(page).last());

  const last = HOME_MANUALES.at(-1);
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

test("the license is stated once on the home page, inside the menu, and not after the last Manual", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const text = (await page.locator("body").textContent()) ?? "";
  expect(text.split(LICENSE).length - 1).toBe(1);
  expect(await licenseCount(page)).toBe(0);
  await menuButton(page).click();
  await expect(page.getByText(LICENSE)).toBeVisible();
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
