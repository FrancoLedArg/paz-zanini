// Screenshots for the `verify` skill: every path at phone and desktop width, with console errors and the WebGL renderer reported.
// --fps: on the phone viewport, with the CPU throttled 4x, scroll each path for 3 s and report frame rate.
import { join } from "node:path";
import { parseArgs } from "node:util";
import { chromium, type Page } from "@playwright/test";

import { errorsOn, VIEWPORTS } from "../e2e/browser.ts";
import { frameStats, screenshotName } from "./shots-lib.ts";

// Headless Chromium otherwise falls back to software WebGL, which misjudges materials and lighting.
// shortcut: ANGLE Metal exists only on macOS, pass a platform backend (e.g. --use-angle=vulkan) when shooting elsewhere.
const GPU_ARGS = [
  "--ignore-gpu-blocklist",
  "--enable-gpu",
  "--use-angle=metal",
];

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    base: { type: "string", default: "http://localhost:5173" },
    out: { type: "string" },
    fps: { type: "boolean", default: false },
  },
});

if (!values.out || positionals.length === 0) {
  console.error(
    "Usage: pnpm shots --out <dir> [--base <url>] [--fps] <path> [<path> ...]",
  );
  process.exit(1);
}

const browser = await chromium.launch({ args: GPU_ARGS });
let failed = false;

for (const [name, options] of Object.entries(VIEWPORTS)) {
  const context = await browser.newContext(options);
  const page = await context.newPage();

  for (const path of positionals) {
    await page.goto(new URL(path, values.base).href, {
      waitUntil: "networkidle",
    });
    const file = join(values.out, screenshotName(name, path));
    await page.screenshot({ path: file, fullPage: true });
    console.log(file);
    if (values.fps && name === "phone") await reportFps(page, path);
  }

  const renderer = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return "no WebGL2";
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    return String(
      gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER),
    );
  });
  console.log(`[${name}] WebGL renderer: ${renderer}`);
  if (/swiftshader|llvmpipe|software/i.test(renderer)) {
    console.log(
      `[${name}] WARNING: software rendering; judge shape and layout only, not materials or lighting.`,
    );
  }
  const errors = await errorsOn(page);
  for (const error of errors) console.log(`[${name}] console error: ${error}`);
  failed ||= errors.length > 0;
  await context.close();
}

await browser.close();
process.exit(failed ? 1 : 0);

async function reportFps(page: Page, path: string) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const timestamps = await page.evaluate(
    () =>
      new Promise<number[]>((resolve) => {
        const times: number[] = [];
        const start = performance.now();
        const distance = document.documentElement.scrollHeight - innerHeight;
        const tick = (now: number) => {
          times.push(now);
          const progress = (now - start) / 3000;
          scrollTo(0, distance * Math.min(progress, 1));
          if (progress < 1) requestAnimationFrame(tick);
          else resolve(times);
        };
        requestAnimationFrame(tick);
      }),
  );
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  const stats = frameStats(timestamps);
  console.log(
    stats
      ? `[phone] ${path} fps (CPU 4x slower): average ${stats.averageFps.toFixed(0)}, worst frame ${stats.worstFrameMs.toFixed(0)} ms`
      : `[phone] ${path} fps: too few frames to measure`,
  );
}
