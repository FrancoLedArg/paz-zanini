import { statSync } from "node:fs";

import { expect, test } from "@playwright/test";

import { errorsOn } from "./browser";

// The viewer's own code, chunk or worker: neither may load before Hojear.
const VIEWER = /\.pdf$|pdf\.worker|hojear-/;

test("Hojear previews a Manual's pages, fetching neither the PDF nor the viewer before the tap", async ({
  page,
}) => {
  const fetched: string[] = [];
  page.on("request", (request) => fetched.push(request.url()));
  await page.goto("/manuales/estadistica-descriptiva-desde-cero");
  await page.waitForLoadState("networkidle");
  expect(fetched.filter((url) => VIEWER.test(url))).toEqual([]);

  await page.getByRole("button", { name: "Hojear" }).click();

  const preview = page.getByRole("dialog", {
    name: "Estadística descriptiva desde cero",
  });
  await expect(
    preview.getByRole("img", { name: "Página 1", exact: true }),
  ).toHaveAttribute("aria-busy", "false", { timeout: 15_000 });
  expect(fetched.some((url) => url.endsWith(".pdf"))).toBe(true);
  expect(await errorsOn(page)).toEqual([]);
});

test("the preview works by keyboard: it opens, scrolls its pages, closes with Escape and gives focus back to Hojear", async ({
  page,
}) => {
  await page.goto("/manuales/estadistica-descriptiva-desde-cero");
  const hojear = page.getByRole("button", { name: "Hojear" });
  await hojear.focus();
  await page.keyboard.press("Enter");

  const preview = page.getByRole("dialog");
  const pages = preview.getByRole("list", { name: "Páginas" });
  await expect(pages).toBeVisible();
  await pages.focus();
  await page.keyboard.press("PageDown");
  await expect
    .poll(() => pages.evaluate((list) => list.scrollTop))
    .toBeGreaterThan(0);
  await page.keyboard.press("Escape");

  await expect(preview).toBeHidden();
  await expect(hojear).toBeFocused();
});

test("Descargar is one tap away inside the preview", async ({ page }) => {
  await page.goto("/manuales/estadistica-inferencial-desde-cero");
  await page.getByRole("button", { name: "Hojear" }).click();

  const download = page.waitForEvent("download");
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Descargar manual" })
    .click();

  expect((await download).suggestedFilename()).toBe(
    "estadistica-inferencial-desde-cero.pdf",
  );
});

test("a long Manual's preview fetches only the parts of the PDF it shows", async ({
  page,
}) => {
  // Métodos numéricos is the largest PDF, about 7.3 MB.
  const { size } = statSync("public/manuales/metodos-numericos-desde-cero.pdf");
  const ranges: string[] = [];
  page.on("request", (request) => {
    const range = request.headers().range;
    if (request.url().endsWith(".pdf") && range) ranges.push(range);
  });
  // Static hosts advertise byte ranges on every PDF; the local preview server (sirv) only on range replies.
  await page.route("**/*.pdf", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: { ...response.headers(), "accept-ranges": "bytes" },
    });
  });
  await page.goto("/manuales/metodos-numericos-desde-cero");
  await page.getByRole("button", { name: "Hojear" }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("img", { name: "Página 1", exact: true }),
  ).toHaveAttribute("aria-busy", "false", { timeout: 15_000 });

  const fetchedBytes = ranges
    .map((range) => /bytes=(\d+)-(\d+)/.exec(range))
    .reduce(
      (total, match) => total + Number(match?.[2]) - Number(match?.[1]) + 1,
      0,
    );
  expect(ranges.length).toBeGreaterThan(0);
  expect(fetchedBytes).toBeLessThan(size / 2);
});
