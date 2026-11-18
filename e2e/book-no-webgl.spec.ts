import { expect, test } from "@playwright/test";

import { errorsOn } from "./browser";

// A browser with WebGL off; launch options force their own worker, so this lives in its own file.
test.use({ launchOptions: { args: ["--disable-webgl"] } });

test("without WebGL the Manual page keeps its SVG Tapa", async ({ page }) => {
  await page.goto("/manuales/estadistica-descriptiva-desde-cero");
  await page.waitForLoadState("networkidle");

  await expect(
    page.getByRole("img", {
      name: "Tapa de Estadística descriptiva desde cero",
    }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  expect(await errorsOn(page)).toEqual([]);
});

test("without WebGL the home keeps the flat Pila, and its books open their Manual pages", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await expect(page.locator("canvas")).toHaveCount(0);
  await page
    .getByRole("list", { name: "La Pila" })
    .getByRole("link", { name: "Estadística inferencial desde cero" })
    .click();
  await expect(page).toHaveURL("/manuales/estadistica-inferencial-desde-cero");
  expect(await errorsOn(page)).toEqual([]);
});
