// PROTOTYPE (#75, round 2): each variant at rest (1440, 390, 320), hovered, and a close-up film of a tap.
// node app/filters-prototype/capture.ts <base-url> <out-dir>
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";
import { chromium, type Page } from "@playwright/test";

const [base = "http://localhost:5174", out = "shots"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  args: ["--ignore-gpu-blocklist", "--enable-gpu", "--use-angle=metal"],
});
const SIZES = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
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
type Size = keyof typeof SIZES;
const errors: string[] = [];

async function open(size: Size, variant: string) {
  const context = await browser.newContext(SIZES[size]);
  await context.addInitScript(() => {
    sessionStorage.setItem("loader-seen", "1");
  });
  const page = await context.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`${variant} ${size}: ${m.text()}`);
  });
  await page.goto(`${base}/?variant=${variant}&bar=0`, {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(
    () => !document.querySelector('[aria-busy="true"]'),
  );
  await setTimeout(1200);
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    errors.push(`${variant} ${size}: scrolls sideways`);
  return page;
}

/** The filters' box, padded, for close-ups. */
async function filterClip(page: Page) {
  const box = await page
    .getByRole("navigation", { name: "Colecciones" })
    .boundingBox();
  if (!box) throw new Error("no filters");
  const pad = 28;
  return {
    x: Math.max(0, box.x - pad),
    y: Math.max(0, box.y - 14),
    width: box.width + pad * 2,
    height: box.height + 40,
  };
}

async function strip(
  file: string,
  frames: { png: Buffer; label: string }[],
  width: number,
  columns = 0,
) {
  const layout = await browser.newPage({
    viewport: { width: 400, height: 300 },
  });
  const grid = columns
    ? `display:grid;grid-template-columns:repeat(${columns},${width}px)`
    : "display:flex";
  await layout.setContent(
    `<body style="margin:0;background:#222;font:12px ui-monospace,monospace;color:#eee;${grid};align-items:start;gap:8px;padding:8px;width:max-content">${frames
      .map(
        (f) =>
          `<figure style="margin:0;width:${width}px"><img style="width:100%;display:block" src="data:image/png;base64,${f.png.toString("base64")}"><figcaption style="padding-top:4px">${f.label}</figcaption></figure>`,
      )
      .join("")}</body>`,
  );
  await layout.screenshot({
    path: join(out, file),
    type: "jpeg",
    quality: 85,
    fullPage: true,
  });
  await layout.close();
  console.log(join(out, file));
}

for (const variant of ["A", "B", "C"]) {
  const rest: { png: Buffer; label: string }[] = [];
  for (const size of Object.keys(SIZES) as Size[]) {
    const page = await open(size, variant);
    rest.push({
      png: await page.screenshot({ scale: "css" }),
      label: `${variant} · ${size}`,
    });
    if (size === "desktop") {
      // Close-ups: at rest, then hovering the next Colección.
      const clip = await filterClip(page);
      const close: { png: Buffer; label: string }[] = [
        { png: await page.screenshot({ clip }), label: "en reposo" },
      ];
      await page
        .getByRole("link", { name: "Ciencia de datos desde cero" })
        .hover();
      await setTimeout(700);
      close.push({
        png: await page.screenshot({ clip }),
        label: "hover en II",
      });
      await strip(`${variant}-close.jpg`, close, 560);
      // A tap, filmed close: the marker should move on the tap.
      await page.mouse.move(0, 400);
      await setTimeout(500);
      const film: { png: Buffer; label: string }[] = [];
      const start = Date.now();
      await page
        .getByRole("link", { name: "Ciencia de datos desde cero" })
        .click();
      while (Date.now() - start < 1100) {
        film.push({
          png: await page.screenshot({ clip }),
          label: `${Date.now() - start} ms`,
        });
        await setTimeout(40);
      }
      await strip(`${variant}-tap.jpg`, film, 420, 4);
    }
    await page.context().close();
  }
  await strip(`${variant}-rest.jpg`, rest, 330);
}
console.log(
  errors.length
    ? `ERRORS:\n${errors.join("\n")}`
    : "no console errors, nothing scrolls sideways",
);
await browser.close();
