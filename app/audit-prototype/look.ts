// PROTOTYPE (#77): one still per size for each query. node app/audit-prototype/look.ts <base> <out> <name>=<path?query> ...
// A path may end with #<n>: scroll to step n first.
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";
import { chromium } from "@playwright/test";

const GPU_ARGS = [
  "--ignore-gpu-blocklist",
  "--enable-gpu",
  "--use-angle=metal",
];
const [base = "http://localhost:5180", out = "shots", ...shots] =
  process.argv.slice(2);
mkdirSync(out, { recursive: true });
export const SIZES = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  "390": {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  "320": {
    viewport: { width: 320, height: 640 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
};
const sizes = (process.env.SIZES ?? "desktop,390,320").split(
  ",",
) as (keyof typeof SIZES)[];
const browser = await chromium.launch({ args: GPU_ARGS });
const errors: string[] = [];
for (const size of sizes) {
  const context = await browser.newContext(SIZES[size]);
  await context.addInitScript(() => {
    sessionStorage.setItem("loader-seen", "1");
  });
  const page = await context.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`${size}: ${m.text()}`);
  });
  for (const shot of shots) {
    const at = shot.indexOf("=");
    const name = shot.slice(0, at);
    const rest = shot.slice(at + 1);
    const [path = "/", step] = rest.split("#");
    const url = new URL(path, base);
    url.searchParams.set("bar", "0");
    await page.goto(url.href, { waitUntil: "networkidle" });
    await page.waitForFunction(
      () => !document.querySelector('[aria-busy="true"]'),
    );
    if (step)
      await page.evaluate((n) => {
        const steps = document.querySelectorAll(
          'ol[aria-label="Manuales"] > li',
        );
        steps[n]?.scrollIntoView({ block: "center", behavior: "instant" });
      }, Number(step));
    await setTimeout(1800);
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    )
      errors.push(`${name} ${size}: scrolls sideways`);
    const file = join(out, `${name}-${size}.png`);
    await page.screenshot({ path: file });
    console.log(file);
  }
  await context.close();
}
console.log(
  errors.length
    ? `ERRORS:\n${errors.join("\n")}`
    : "no console errors, nothing scrolls sideways",
);
await browser.close();
