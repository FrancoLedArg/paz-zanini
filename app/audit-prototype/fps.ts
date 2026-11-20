// PROTOTYPE (#77): each idea's frame rate on the phone profile (390 @3x, CPU 4x slower), on the production build.
// node app/audit-prototype/fps.ts <base> <query> [<query> ...]. A query's action: sweep (default), flicks, open.
import { setTimeout } from "node:timers/promises";
import { chromium, type Page } from "@playwright/test";

const GPU_ARGS = [
  "--ignore-gpu-blocklist",
  "--enable-gpu",
  "--use-angle=metal",
];
const [base = "http://localhost:5181", ...queries] = process.argv.slice(2);
const browser = await chromium.launch({ args: GPU_ARGS });

const stats = (t: number[]) => {
  const d = t.slice(1).map((x, i) => x - (t[i] ?? x));
  const span = (t.at(-1) ?? 0) - (t[0] ?? 0);
  return `${((d.length / span) * 1000).toFixed(0)} fps, worst ${Math.max(...d).toFixed(0)} ms, ${d.filter((x) => x > 34).length} frames > 34 ms`;
};

async function swipe(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: "touchStart" | "touchMove" | "touchEnd", y?: number) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: y === undefined ? [] : [{ x: 195, y }],
    });
  await touch("touchStart", 600);
  for (let i = 1; i <= 8; i++) {
    await touch("touchMove", 600 - i * 20);
    await setTimeout(15);
  }
  await touch("touchEnd");
}

for (const query of queries) {
  const [q = "", action = "sweep"] = query.split(" ");
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  await context.addInitScript(() => {
    sessionStorage.setItem("loader-seen", "1");
  });
  const page = await context.newPage();
  await page.goto(`${base}/?${q}`, { waitUntil: "networkidle" });
  await page.waitForFunction(
    () => !document.querySelector('[aria-busy="true"]'),
  );
  await setTimeout(1000);
  const shown = await page.evaluate(
    () => document.querySelector('.helice-3d[aria-busy="false"]') !== null,
  );
  if (!shown) throw new Error(`${q}: the 3D Hélice isn't shown`);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.evaluate(() => {
    const w = window as unknown as { frames_: number[] };
    w.frames_ = [];
    const tick = (now: number) => {
      w.frames_.push(now);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  let main = "";
  if (action === "sweep") {
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          const start = performance.now();
          const distance = document.documentElement.scrollHeight - innerHeight;
          const step = (now: number) => {
            const p = (now - start) / 3000;
            scrollTo(0, distance * Math.min(p, 1));
            if (p < 1) requestAnimationFrame(step);
            else resolve();
          };
          requestAnimationFrame(step);
        }),
    );
    const sweep = await page.evaluate(() =>
      (window as unknown as { frames_: number[] }).frames_.splice(0),
    );
    main = `sweep ${stats(sweep)}`;
    await setTimeout(1500);
  } else if (action === "flicks") {
    for (let i = 0; i < 3; i++) {
      await swipe(page);
      await setTimeout(700);
    }
  } else if (action === "open") {
    await page.touchscreen.tap(195, 422);
    await setTimeout(1800);
  }
  const rest = await page.evaluate(
    () => (window as unknown as { frames_: number[] }).frames_,
  );
  console.log(
    `${q || "today"} [${action}]: ${main ? `${main}; then ` : ""}${action === "sweep" ? "settle" : action} ${stats(rest)}`,
  );
  await context.close();
}
await browser.close();
