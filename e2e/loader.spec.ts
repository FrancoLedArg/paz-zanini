import { expect, type Page, test } from "@playwright/test";

import {
  block3d,
  errorsOn,
  firstFrame,
  layoutShift,
  shown3d,
  track,
} from "./browser";

/** The first-visit cover; presentation only, so it is hidden from assistive tech and found by its test id. */
const cover = (page: Page) => page.getByTestId("loader");
const count = (page: Page) => cover(page).getByText(/^\d+$/);

test("a first visit shows the cover from the first frame, counts up, and lifts into the first view once the Hélice is ready", async ({
  page,
}) => {
  await firstFrame(page, "/");
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

  await firstFrame(page, "/");
  await expect(cover(page)).toBeHidden();
});

test("a keyboard visitor's first Tab lifts the cover, so focus is never hidden under it", async ({
  page,
}) => {
  // Without the 3D, only the Tab can lift the cover before the cap.
  await block3d(page);
  await page.goto("/");
  await expect(cover(page)).toBeVisible();

  await page.keyboard.press("Tab");
  await expect(cover(page)).toBeHidden({ timeout: 2_000 });
});

test("coming back to the home page in the same session goes straight to the page", async ({
  page,
}) => {
  await page.goto("/");
  await expect(cover(page)).toBeHidden({ timeout: 20_000 });

  await page
    .getByRole("region", { name: "Manual en foco" })
    .getByRole("link")
    .click();
  await expect(page).toHaveURL("/manuales/estadistica-descriptiva-desde-cero");
  await page
    .getByRole("banner")
    .getByRole("link", { name: "Raúl E. Paz Zanini" })
    .click();
  await expect(page).toHaveURL("/");
  await expect(track(page)).toBeVisible();
  // Once, not retried: a cover that came back would lift again on its own a moment later.
  expect(await cover(page).isVisible()).toBe(false);
});

test("under reduced motion there is no cover", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await firstFrame(page, "/");
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
  await block3d(page);
  await page.goto("/");
  await expect(cover(page)).toBeVisible();

  await expect(cover(page)).toBeHidden({ timeout: 8_000 });
  await track(page)
    .getByRole("link", { name: "Estadística descriptiva desde cero" })
    .click();
  await expect(page).toHaveURL("/manuales/estadistica-descriptiva-desde-cero");
});
