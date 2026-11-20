// PROTOTYPE (#77): films one action as a strip of frames. node app/audit-prototype/film.ts <base> <out-file> <size>
// <path?query> <action> [ms] [every] [columns]. Actions: open (tap the book in focus), flick (one wheel flick or swipe),
// flicks (three quick flicks), none.
import { setTimeout } from "node:timers/promises";
import { chromium, type Page } from "@playwright/test";

const GPU_ARGS = [
  "--ignore-gpu-blocklist",
  "--enable-gpu",
  "--use-angle=metal",
];
const [
  base = "http://localhost:5180",
  file = "film.jpg",
  size = "desktop",
  path = "/",
  action = "none",
  ms = "1600",
  every = "60",
  columns = "6",
] = process.argv.slice(2);
const SIZES = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
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
const options = SIZES[size as keyof typeof SIZES];
const browser = await chromium.launch({ args: GPU_ARGS });
const context = await browser.newContext(options);
await context.addInitScript(() => {
  sessionStorage.setItem("loader-seen", "1");
});
const page = await context.newPage();
const errors: string[] = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const url = new URL(path, base);
url.searchParams.set("bar", "0");
await page.goto(url.href, { waitUntil: "networkidle" });
await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
await setTimeout(1500);

const { width, height } = options.viewport;
const mobile = "hasTouch" in options;

/** A swipe up by `distance` px over `duration` ms, through CDP touch events (so the page sees a real touch). */
async function swipe(p: Page, distance: number, duration = 120) {
  const cdp = await p.context().newCDPSession(p);
  const x = width / 2;
  const y0 = height * 0.7;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y: y0 }],
  });
  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y: y0 - (distance * i) / steps }],
    });
    await setTimeout(duration / steps);
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
}

/** A trackpad-like flick: a burst of wheel deltas, then a decaying inertial tail. */
async function wheelFlick(p: Page) {
  await p.mouse.move(width / 2, height / 2);
  const deltas = [50, 110, 160, 140];
  for (let d = 120; d > 2; d *= 0.88) deltas.push(d);
  for (const d of deltas) {
    await p.mouse.wheel(0, d);
    await setTimeout(16);
  }
}

const act = async () => {
  if (action === "open") {
    if (mobile) await page.touchscreen.tap(width / 2, height / 2);
    else await page.mouse.click(width / 2, height / 2);
  } else if (action === "flick") {
    if (mobile) await swipe(page, 160);
    else await wheelFlick(page);
  } else if (action === "filtro") {
    await page
      .getByRole("link", { name: "Ciencia de datos desde cero" })
      .click();
  } else if (action === "flicks") {
    for (let i = 0; i < 3; i++) {
      if (mobile) await swipe(page, 160);
      else await wheelFlick(page);
      await setTimeout(mobile ? 150 : 250);
    }
  }
};

const frames: { png: string; t: number; y: number }[] = [];
const start = Date.now();
const acting = act();
while (Date.now() - start < Number(ms)) {
  const shot = await page
    .screenshot({ type: "jpeg", quality: 70, scale: "css" })
    .catch(() => null);
  const y = await page.evaluate(() => scrollY).catch(() => -1);
  if (shot)
    frames.push({ png: shot.toString("base64"), t: Date.now() - start, y });
  await setTimeout(Number(every));
}
await acting;
const w = width > 800 ? 420 : 170;
const layout = await browser.newPage({ viewport: { width: 400, height: 300 } });
await layout.setContent(
  `<body style="margin:0;background:#222;font:11px ui-monospace,monospace;color:#eee;display:grid;grid-template-columns:repeat(${columns},${w}px);gap:6px;padding:6px;width:max-content">${frames
    .map(
      (f) =>
        `<figure style="margin:0"><img style="width:100%;display:block" src="data:image/jpeg;base64,${f.png}"><figcaption>${f.t} ms · y ${Math.round(f.y)}</figcaption></figure>`,
    )
    .join("")}</body>`,
);
await layout.screenshot({
  path: file,
  type: "jpeg",
  quality: 82,
  fullPage: true,
});
console.log(frames.map((f) => `${f.t}:${Math.round(f.y)}`).join(" "));
console.log(
  file,
  errors.length ? `ERRORS: ${errors.join(" | ")}` : "no console errors",
);
await browser.close();
