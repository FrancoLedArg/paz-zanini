import { expect, type Page, test } from "@playwright/test";

import {
  coleccionesWithCount,
  manualesIn,
  manualPath,
} from "../app/catalog/catalog";
import {
  errorsOn,
  filterLink,
  logo,
  loseWebGL,
  layoutShift,
  menuButton,
  offCentre,
  record,
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

test("a scroll always comes to rest on a step, in the middle of the screen", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // A quarter of the way past a step: the track pulls it back (a step is a whole screen). Headless Chromium doesn't
  // keep a synthetic wheel to one book per flick (#77), so that is checked by hand on a trackpad and a phone.
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

test("the paper's grain lies over the whole page, the 3D included, and never takes a tap", async ({
  page,
}) => {
  await page.goto("/");
  await shown3d(page);

  const grain = await page.evaluate(() => {
    const layer = document.querySelector(".grain");
    const canvas = document.querySelector(".helice-3d");
    if (!layer || !canvas) return null;
    const box = layer.getBoundingClientRect();
    return {
      covers: box.width === innerWidth && box.height === innerHeight,
      over3d:
        Number(getComputedStyle(layer).zIndex) >
        Number(getComputedStyle(canvas).zIndex),
      // A tap at the book in focus lands on what lies under the grain.
      tapsThrough:
        document
          .elementFromPoint(innerWidth / 2, innerHeight / 2)
          ?.closest(".grain") === null,
    };
  });
  expect(grain).toEqual({ covers: true, over3d: true, tapsThrough: true });
  await tapBook(inferencial(page));
  await expect(page).toHaveURL("/manuales/estadistica-inferencial-desde-cero");
});

test("the Autor's name links home from the bottom-left corner of every Hélice page", async ({
  page,
}) => {
  const screen = page.viewportSize() ?? { width: 0, height: 0 };
  for (const { path } of coleccionesWithCount()) {
    await page.goto(path);
    const box = await logo(page).boundingBox();
    expect(box?.x ?? screen.width).toBeLessThan(screen.width / 4);
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeGreaterThan(
      screen.height * 0.85,
    );
    await expect(
      page
        .getByRole("banner")
        .getByRole("link", { name: "Raúl E. Paz Zanini" }),
    ).toHaveAttribute("href", "/");
  }
});

test.describe("the record of the book in focus", () => {
  for (const motion of ["no-preference", "reduce"] as const)
    test(`names the book the Hélice rests on, with its Paso, Herramientas and Páginas (motion: ${motion})`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: motion });
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      for (const index of [0, 2]) {
        await scrollToStep(step(page, index));
        const manual = HOME_MANUALES[index];
        await expect(record(page)).toContainText(manual?.title ?? "");
        await expect(record(page).getByRole("definition")).toHaveText([
          String(index + 1),
          manual?.herramientas.length
            ? manual.herramientas.join(" y ")
            : "Sin software",
          String(manual?.pages),
        ]);
        await expect(record(page)).toHaveCSS("opacity", "1");
      }
      if (motion === "reduce")
        expect(
          await record(page).evaluate(
            (r) => r.getAnimations({ subtree: true }).length,
          ),
        ).toBe(0);
    });

  test("hides as soon as the scroll moves, and shows again once it rests", async ({
    page,
  }) => {
    // Without motion the record hides at once instead of fading, so one frame tells.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(record(page)).toHaveCSS("opacity", "1");

    const opacityAfterAScroll = await record(page).evaluate(
      (r) =>
        new Promise<string>((resolve) => {
          scrollBy({ top: 40, behavior: "instant" });
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              resolve(getComputedStyle(r).opacity);
            }),
          );
        }),
    );
    expect(opacityAfterAScroll).toBe("0");
    await expect(record(page)).toHaveCSS("opacity", "1");
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
