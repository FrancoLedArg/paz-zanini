// PROTOTYPE (#75): film opening a Manual from the Hélice (a click on the book in focus).
import { chromium } from "@playwright/test";
import { setTimeout } from "node:timers/promises";
const [base = "http://localhost:5174", file = "open.jpg"] =
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
await page.goto(`${base}/?bar=0`, { waitUntil: "networkidle" });
await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
await setTimeout(1500);
await page.mouse.move(720, 460);
await setTimeout(600);
const cursor = await page.evaluate(
  () =>
    getComputedStyle(document.elementFromPoint(720, 460) ?? document.body)
      .cursor,
);
console.log("cursor over the book:", cursor);
const frames: string[] = [];
const start = Date.now();
void page.mouse.click(720, 460);
while (Date.now() - start < 2400) {
  const shot = await page
    .screenshot({ type: "jpeg", quality: 60 })
    .catch(() => null);
  if (shot)
    frames.push(
      `<figure style="margin:0"><img style="width:100%" src="data:image/jpeg;base64,${shot.toString("base64")}"><figcaption>${Date.now() - start} ms</figcaption></figure>`,
    );
  await setTimeout(150);
}
const lay = await browser.newPage();
await lay.setContent(
  `<body style="margin:0;background:#222;color:#eee;font:11px monospace;display:grid;grid-template-columns:repeat(5,420px);gap:6px;padding:6px;width:max-content">${frames.join("")}</body>`,
);
await lay.screenshot({ path: file, fullPage: true, type: "jpeg", quality: 80 });
await browser.close();
