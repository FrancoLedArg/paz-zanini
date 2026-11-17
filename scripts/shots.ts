// Screenshots for the `verify` skill: every path at phone and desktop width, with console errors and the WebGL renderer reported.
// Usage: pnpm shots [--base http://localhost:5173] [--out <dir>] [--fps] <path> [<path> ...]
// --fps: on the phone viewport, with the CPU throttled 4x, scroll each path for 3 s and report frame rate.
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { chromium, type Page } from "@playwright/test";

const VIEWPORTS = [
  {
    name: "phone",
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
  {
    name: "desktop",
    width: 1440,
    height: 900,
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
  },
] as const;

// Ask Chromium for the real GPU; headless otherwise falls back to software WebGL, which misjudges materials and lighting.
const GPU_ARGS = [
  "--ignore-gpu-blocklist",
  "--enable-gpu",
  "--use-angle=metal",
];

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    base: { type: "string", default: "http://localhost:5173" },
    out: { type: "string", default: "shots" },
    fps: { type: "boolean", default: false },
  },
});

if (positionals.length === 0) {
  console.error(
    "Give at least one path, e.g. pnpm shots / /manuales/estadistica-descriptiva-desde-cero",
  );
  process.exit(1);
}

const browser = await chromium.launch({ args: GPU_ARGS });
await mkdir(values.out, { recursive: true });
let failed = false;

for (const viewport of VIEWPORTS) {
  const { name, ...options } = viewport;
  const context = await browser.newContext({
    viewport: { width: options.width, height: options.height },
    ...options,
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  for (const path of positionals) {
    await page.goto(new URL(path, values.base).href, {
      waitUntil: "networkidle",
    });
    const slug = path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
    const file = join(values.out, `${name}-${slug || "home"}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(file);
    if (values.fps && name === "phone") await measureFps(page, path);
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
  for (const error of errors) console.log(`[${name}] console error: ${error}`);
  failed ||= errors.length > 0;
  await context.close();
}

await browser.close();
process.exit(failed ? 1 : 0);

async function measureFps(page: Page, path: string) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const frames = await page.evaluate(
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
  const gaps = frames.slice(1).map((time, i) => time - (frames[i] ?? time));
  const average = (1000 * gaps.length) / gaps.reduce((a, b) => a + b, 0);
  const worst = Math.max(...gaps);
  console.log(
    `[phone] ${path} fps (CPU 4x slower): average ${average.toFixed(0)}, worst frame ${worst.toFixed(0)} ms`,
  );
}
