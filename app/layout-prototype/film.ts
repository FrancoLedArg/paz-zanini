/* eslint-disable -- PROTOTYPE (#67), throwaway: never merged. */
// PROTOTYPE (#67): films a Colección change from the bar's "next" button with a CDP screencast (~60 fps, timestamped).
// node --experimental-strip-types app/layout-prototype/film.ts <base> <outdir> [variant] [width] [height]
import { writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium } from "@playwright/test";
const [base, out, v = "A", w = "1440", h = "900", mode = "bar"] =
  process.argv.slice(2);
const browser = await chromium.launch({
  args: ["--ignore-gpu-blocklist", "--enable-gpu", "--use-angle=metal"],
});
const context = await browser.newContext({
  viewport: { width: Number(w), height: Number(h) },
});
await context.addInitScript(() => sessionStorage.setItem("loader-seen", "1"));
const page = await context.newPage();
page.on("console", (m) => m.text().startsWith("[T]") && console.log(m.text()));
await page.goto(`${base}/?variant=${v}`);
await page.waitForSelector(".helice-3d[aria-busy=false]");
await sleep(3000);
const cdp = await context.newCDPSession(page);
const frames: { t: number; data: string }[] = [];
cdp.on("Page.screencastFrame", (f) => {
  frames.push({ t: f.metadata.timestamp!, data: f.data });
  void cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId });
});
await cdp.send("Page.startScreencast", {
  format: "jpeg",
  quality: 70,
  maxWidth: 720,
  everyNthFrame: 1,
});
await sleep(300);
const t0 = Date.now() / 1000;
if (mode === "menu") {
  await page.getByRole("button", { name: "Índice" }).click();
  await sleep(1200);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Ciencia/ })
    .click();
} else if (mode === "enter")
  await page.getByRole("button", { name: "Entrada" }).click();
else await page.getByRole("button", { name: /Colección →/ }).click();
await sleep(3200);
await cdp.send("Page.stopScreencast");
await browser.close();
for (const f of frames) {
  const ms = Math.round((f.t - t0) * 1000);
  writeFileSync(
    `${out}/F${ms < 0 ? "-" : ""}${String(Math.abs(ms)).padStart(4, "0")}.jpg`,
    Buffer.from(f.data, "base64"),
  );
}
console.log(frames.length, "frames");
