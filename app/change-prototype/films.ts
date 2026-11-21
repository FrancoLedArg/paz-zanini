// PROTOTYPE (#84): films of each Colección change. Every `cambio` at 1440, 390 and 320 with 13 books, and at 1440 with
// 7 and 5; each film is the change from Estadística desde cero to Ciencia de datos desde cero, as an mp4 and a strip of
// frames every 100 ms. Timing truth is the Firefox timeline; these are for judging the motion.
// node app/change-prototype/films.ts <base-url> <out-dir>
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";
import { type BrowserContextOptions, chromium } from "@playwright/test";

import { GPU_ARGS } from "../../e2e/browser.ts";

const [base = "http://localhost:4184", out = "films"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const SIZES = {
  "1440": { viewport: { width: 1440, height: 900 } },
  "390": {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
  "320": {
    viewport: { width: 320, height: 640 },
    isMobile: true,
    hasTouch: true,
  },
} satisfies Record<string, BrowserContextOptions>;
type Size = keyof typeof SIZES;
const RUNS: [cambio: string, size: Size, libros: string][] = [];
for (const cambio of ["actual", "fundido", "uno", "paso"]) {
  for (const size of Object.keys(SIZES) as Size[])
    RUNS.push([cambio, size, "13"]);
  RUNS.push([cambio, "1440", "7"], [cambio, "1440", "5"]);
}

const browser = await chromium.launch({ args: GPU_ARGS });
const errors: string[] = [];
for (const [cambio, size, libros] of RUNS) {
  const name = `${cambio}-${libros}-${size}`;
  const tmp = join(out, `.${name}`);
  const options = SIZES[size];
  const context = await browser.newContext({
    ...options,
    recordVideo: { dir: tmp, size: options.viewport },
  });
  await context.addInitScript(() => {
    sessionStorage.setItem("loader-seen", "1");
  });
  const page = await context.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`${name}: ${m.text()}`);
  });
  const started = Date.now();
  await page.goto(`${base}/?cambio=${cambio}&libros=${libros}&bar=0`);
  await page.waitForSelector('.helice-3d[aria-busy="false"]');
  await setTimeout(1500);
  const at = (Date.now() - started) / 1000;
  await page.getByRole("link", { name: "Ciencia de datos desde cero" }).click();
  await setTimeout(2200);
  await context.close();
  const [video] = readdirSync(tmp);
  if (!video) throw new Error(`no video for ${name}`);
  // From just before the click, 2 s; the strip is every 100 ms, four to a row.
  const from = Math.max(0, at - 0.2).toFixed(2);
  const ff = [
    "-y",
    "-loglevel",
    "error",
    "-ss",
    from,
    "-t",
    "2",
    "-i",
    join(tmp, video),
  ];
  execFileSync("ffmpeg", [
    ...ff,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-an",
    join(out, `${name}.mp4`),
  ]);
  const scale = size === "1440" ? 480 : 240;
  execFileSync("ffmpeg", [
    ...ff,
    "-vf",
    // Read left to right, 100 ms apart; the first frame is 200 ms before the click.
    `fps=10,scale=${scale}:-1,tile=${size === "1440" ? 4 : 7}x${size === "1440" ? 5 : 3}`,
    "-frames:v",
    "1",
    join(out, `${name}.jpg`),
  ]);
  rmSync(tmp, { recursive: true });
  console.log(name);
}
await browser.close();
console.log(
  errors.length ? `ERRORS:\n${errors.join("\n")}` : "no console errors",
);
