// PROTOTYPE (#75): frames of a Colección change started from a filter, as one strip per size.
// node app/filters-prototype/film.ts <base-url> <out-dir>
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";
import { chromium } from "@playwright/test";

const [base = "http://localhost:5174", out = "shots"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  args: ["--ignore-gpu-blocklist", "--enable-gpu", "--use-angle=metal"],
});
const SIZES = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  "390": {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  },
};

for (const [size, options] of Object.entries(SIZES)) {
  const context = await browser.newContext(options);
  await context.addInitScript(() => {
    sessionStorage.setItem("loader-seen", "1");
  });
  const page = await context.newPage();
  await page.goto(
    `${base}/?bar=0&words=ninguna&menu=desplegable&names=corto&mark=raya&phone=fila`,
    {
      waitUntil: "networkidle",
    },
  );
  await page.waitForFunction(
    () => !document.querySelector('[aria-busy="true"]'),
  );
  await setTimeout(1000);
  const frames: { t: number; png: string; url: string }[] = [];
  const start = Date.now();
  await page
    .getByRole("link", { name: "Ciencia de datos desde cero" })
    .first()
    .click();
  while (Date.now() - start < 2000) {
    const png = (await page.screenshot({ type: "jpeg", quality: 70 })).toString(
      "base64",
    );
    frames.push({
      t: Date.now() - start,
      png,
      url: new URL(page.url()).pathname,
    });
    await setTimeout(110);
  }
  const width = size === "desktop" ? 360 : 150;
  const layout = await browser.newPage({
    viewport: { width: 400, height: 300 },
  });
  await layout.setContent(
    `<body style="margin:0;background:#222;font:12px ui-monospace,monospace;color:#eee;display:flex;align-items:flex-start;gap:6px;padding:8px;width:max-content">${frames
      .map(
        (f) =>
          `<figure style="margin:0;width:${width}px"><img style="width:100%;display:block" src="data:image/jpeg;base64,${f.png}"><figcaption style="padding-top:4px">${f.t} ms<br>${f.url}</figcaption></figure>`,
      )
      .join("")}</body>`,
  );
  await layout.screenshot({
    path: join(out, `change-${size}.jpg`),
    type: "jpeg",
    quality: 80,
    fullPage: true,
  });
  console.log(join(out, `change-${size}.jpg`), frames.length, "frames");
  await context.close();
}
await browser.close();
