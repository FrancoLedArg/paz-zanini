/* eslint-disable -- PROTOTYPE (#67), throwaway: never merged. */
// PROTOTYPE (#67): frames every 150 ms through a Colección change from the menu (variant A, desktop).
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "@playwright/test";
const [base, out, v = "A"] = process.argv.slice(2);
const browser = await chromium.launch({
  args: ["--ignore-gpu-blocklist", "--enable-gpu", "--use-angle=metal"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
await context.addInitScript(() => sessionStorage.setItem("loader-seen", "1"));
const page = await context.newPage();
await page.goto(`${base}/?variant=${v}&bar=0`);
await page.waitForSelector(".helice-3d[aria-busy=false]");
await sleep(2500);
const start = Date.now();
if (v === "B")
  void page
    .getByRole("navigation", { name: "Colecciones" })
    .getByRole("button", { name: /Ciencia/ })
    .click();
else {
  await page.getByRole("button", { name: "Índice" }).click();
  await sleep(1200);
  void page
    .getByRole("dialog")
    .getByRole("button", { name: /Ciencia/ })
    .click();
}
const t0 = Date.now();
for (let i = 0; i < 24; i++) {
  await page.screenshot({
    path: `${out}/T${v}-${String(Date.now() - t0).padStart(4, "0")}.png`,
  });
  await sleep(40);
}
await browser.close();
