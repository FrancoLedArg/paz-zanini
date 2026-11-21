// PROTOTYPE (#84, round 2): films of each Colección change, every `cambio` at 1440, 390 and 320. Each film is the change
// from Estadística desde cero to Ciencia de datos desde cero, as an mp4 and a strip of frames every 100 ms. Timing truth
// is the Firefox timeline (timeline.mjs); these are for judging the motion.
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
const CAMBIOS = ["fundido", "uno", "paso", "fondo", "actual"];
/** Seconds filmed from just before the click: the build's still beat and the whole movement. */
const LENGTH = 2.8;

const browser = await chromium.launch({ args: GPU_ARGS });
const errors: string[] = [];
for (const cambio of CAMBIOS) {
  for (const size of Object.keys(SIZES) as Size[]) {
    const name = `${cambio}-${size}`;
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
    await page.goto(`${base}/?cambio=${cambio}&bar=0`);
    await page.waitForSelector('.helice-3d[aria-busy="false"]');
    await setTimeout(1500);
    const at = (Date.now() - started) / 1000;
    await page
      .getByRole("link", { name: "Ciencia de datos desde cero" })
      .click();
    await setTimeout(LENGTH * 1000 + 300);
    await context.close();
    const [video] = readdirSync(tmp);
    if (!video) throw new Error(`no video for ${name}`);
    const input = [
      "-y",
      "-loglevel",
      "error",
      "-ss",
      Math.max(0, at - 0.2).toFixed(2),
      "-t",
      String(LENGTH),
      "-i",
      join(tmp, video),
    ];
    execFileSync("ffmpeg", [
      ...input,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-an",
      join(out, `${name}.mp4`),
    ]);
    const wide = size === "1440";
    // Read left to right, 100 ms apart; the first frame is 200 ms before the click.
    execFileSync("ffmpeg", [
      ...input,
      "-vf",
      `fps=10,scale=${wide ? 480 : 240}:-1,tile=${wide ? "4x7" : "7x4"}`,
      "-frames:v",
      "1",
      join(out, `${name}.jpg`),
    ]);
    rmSync(tmp, { recursive: true });
    console.log(name);
  }
}
await browser.close();
console.log(
  errors.length ? `ERRORS:\n${errors.join("\n")}` : "no console errors",
);
