import { expect, test } from "@playwright/test";

import { errorsOn } from "./browser";

test("the home page HTML is prerendered in Spanish", async ({ request }) => {
  const html = await (await request.get("/")).text();

  expect(html).toContain('<html lang="es"');
  expect(html).toMatch(/<h1[^>]*>Estadística desde cero<\/h1>/);
});

test("the home page hydrates without console errors", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await errorsOn(page)).toEqual([]);
});
