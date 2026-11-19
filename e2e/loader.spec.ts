import { expect, type Page, test } from "@playwright/test";

import { errorsOn, layoutShift, shown3d, track } from "./browser";

/** The first-visit cover; presentation only, so it is hidden from assistive tech and found by its test id. */
const cover = (page: Page) => page.getByTestId("loader");
const count = (page: Page) => cover(page).getByText(/^\d+$/);

test("a first visit shows the cover from the first frame, counts up, and lifts into the first view once the Hélice is ready", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "commit" });
  await page.waitForSelector("body");
  await expect(cover(page)).toBeVisible();
  await expect(count(page)).toHaveText("00");

  await expect(count(page)).toHaveText("100", { timeout: 20_000 });
  await shown3d(page);
  await expect(cover(page)).toBeHidden();
  expect(await layoutShift(page)).toBeLessThan(0.1);
  expect(await errorsOn(page)).toEqual([]);
});

test("a second load in the same session goes straight to the page", async ({
  page,
}) => {
  await page.goto("/");
  await expect(cover(page)).toBeHidden({ timeout: 20_000 });

  await page.reload({ waitUntil: "commit" });
  await page.waitForSelector("body");
  await expect(cover(page)).toBeHidden();
});

test("under reduced motion there is no cover", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "commit" });
  await page.waitForSelector("body");
  await expect(cover(page)).toBeHidden();
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("there is no cover", async ({ page }) => {
    await page.goto("/");
    await expect(cover(page)).toBeHidden();
  });
});

test("a Hélice that never becomes ready still lifts the cover within the cap, and the flat track works", async ({
  page,
}) => {
  // The 3D chunk never arrives.
  await page.route(/\/assets\/book-[^/]+\.js$/, () => undefined);
  await page.goto("/");
  await expect(cover(page)).toBeVisible();

  await expect(cover(page)).toBeHidden({ timeout: 8_000 });
  await track(page)
    .getByRole("link", { name: "Estadística descriptiva desde cero" })
    .click();
  await expect(page).toHaveURL("/manuales/estadistica-descriptiva-desde-cero");
});
