/* eslint-disable -- PROTOTYPE (#67), throwaway: never merged. */
// PROTOTYPE (#67), never merged: frames of each variant for the issue.
// node app/layout-prototype/capture.ts <base> <out-dir> [A B C]
import { mkdirSync, writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium, type Page } from "@playwright/test";

import { frameStats } from "../../scripts/shots-lib.ts";

const GPU_ARGS = [
  "--ignore-gpu-blocklist",
  "--enable-gpu",
  "--use-angle=metal",
];
const VIEWPORTS = {
  phone: {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
  desktop: { viewport: { width: 1440, height: 900 } },
};

const [base = "http://localhost:5174", out = "shots", ...picked] =
  process.argv.slice(2);
const variants = picked.length ? picked : ["A", "B", "C"];
mkdirSync(out, { recursive: true });
const report: Record<string, unknown> = {};

const browser = await chromium.launch({ args: GPU_ARGS });

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${out}/${name}.png` });
}

/** rAF timestamps for `ms`, started before `action` runs. */
async function frames(page: Page, ms: number, action: () => Promise<void>) {
  await page.evaluate((ms) => {
    const w = window as unknown as { __t: number[] };
    w.__t = [];
    const end = performance.now() + ms;
    const tick = (t: number) => {
      w.__t.push(t);
      if (t < end) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, ms);
  await action();
  await sleep(ms + 100);
  return frameStats(
    await page.evaluate(() => (window as unknown as { __t: number[] }).__t),
  );
}

for (const v of variants) {
  for (const [vp, options] of Object.entries(VIEWPORTS)) {
    const context = await browser.newContext({
      ...options,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    const tag = `${v}-${vp}`;

    // First load: the cover, then the entrance once the 3D Hélice has faded in.
    await page.goto(`${base}/?variant=${v}&bar=0`);
    await page.waitForSelector(".helice-3d[aria-busy=false]", {
      timeout: 30000,
    });
    for (const [i, t] of [0, 250, 500, 1000, 2500].entries()) {
      if (i) await sleep(t - [0, 250, 500, 1000, 2500][i - 1]!);
      await shot(page, `${tag}-1-enter-${t}`);
    }
    // The words between two books, then at rest on the third.
    const step = await page.evaluate(() => innerHeight);
    await page.evaluate(
      (y) => scrollTo({ top: y, behavior: "instant" }),
      step * 1.5,
    );
    await sleep(500);
    await shot(page, `${tag}-2-between`);
    await page.evaluate(
      (y) => scrollTo({ top: y, behavior: "instant" }),
      step * 2,
    );
    await sleep(1500);
    await shot(page, `${tag}-3-rest`);

    // The menu.
    await page.getByRole("button", { name: "Índice" }).click();
    await sleep(1300);
    await shot(page, `${tag}-4-menu`);

    // A Colección change: from the menu in A and C, from the on-screen Colecciones in B.
    if (v === "B") {
      await page.keyboard.press("Escape");
      await sleep(700);
    }
    const pick = page
      .getByRole(v === "B" ? "navigation" : "dialog", {
        name: v === "B" ? "Colecciones" : "Índice",
      })
      .getByRole("button", { name: /Ciencia de datos/ });
    const times = [150, 450, 800, 1200, 1700, 3600];
    let last = 0;
    const clicked = pick.click();
    for (const t of times) {
      await sleep(t - last);
      last = t;
      await shot(page, `${tag}-5-change-${t}`);
    }
    await clicked;

    // Frame rate on the phone, CPU 4x throttled: a first-load entrance and a change.
    if (vp === "phone") {
      const cdp = await context.newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await page.waitForURL(/coleccion=/);
      await sleep(1000);
      if (v === "B") {
        report[`${tag}-change`] = await frames(page, 3000, () =>
          page
            .getByRole("navigation", { name: "Colecciones" })
            .getByRole("button", { name: /aplicada/ })
            .click(),
        );
      } else {
        await page.getByRole("button", { name: "Índice" }).click();
        await sleep(1300);
        report[`${tag}-change`] = await frames(page, 3500, () =>
          page
            .getByRole("dialog", { name: "Índice" })
            .getByRole("button", { name: /aplicada/ })
            .click(),
        );
      }
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    }
    report[`${tag}-url`] = page.url();
    report[`${tag}-errors`] = errors;
    await context.close();
  }
}
await browser.close();
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
