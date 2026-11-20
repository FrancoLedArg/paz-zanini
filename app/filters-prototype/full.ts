// PROTOTYPE (#75): one full desktop frame, at 1x, for judging margins.
import { chromium } from "@playwright/test";
import { setTimeout } from "node:timers/promises";
const [base = "http://localhost:5174", file = "desktop.png"] =
  process.argv.slice(2);
const browser = await chromium.launch({
  args: ["--ignore-gpu-blocklist", "--enable-gpu", "--use-angle=metal"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
await context.addInitScript(() => {
  sessionStorage.setItem("loader-seen", "1");
});
const page = await context.newPage();
await page.goto(`${base}/`, { waitUntil: "networkidle" });
await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
await setTimeout(1200);
await page.screenshot({ path: file });
await browser.close();
