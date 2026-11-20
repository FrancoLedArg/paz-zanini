/* eslint-disable @typescript-eslint/no-unnecessary-type-conversion, @typescript-eslint/no-unnecessary-condition -- an SVG element's className and textContent aren't what the DOM types say. */
// PROTOTYPE (#75): audit capture. Films a site's load, a scroll step, a hover, a click; dumps its type, colour, texture
// and motion tokens. node app/filters-prototype/audit.ts <url> <out-dir> <name>
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";
import { type Browser, chromium, type Page } from "@playwright/test";

const [url = "", out = "audit", name = "site"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser: Browser = await chromium.launch({
  args: [
    "--ignore-gpu-blocklist",
    "--enable-gpu",
    "--use-angle=metal",
    "--autoplay-policy=no-user-gesture-required",
  ],
});

async function film(
  page: Page,
  file: string,
  ms: number,
  every: number,
  columns: number,
  act?: () => Promise<void>,
) {
  const frames: { png: string; t: number }[] = [];
  const start = Date.now();
  if (act) void act();
  while (Date.now() - start < ms) {
    // A frame mid-navigation can't be captured; skip it.
    const shot = await page
      .screenshot({ type: "jpeg", quality: 60 })
      .catch(() => null);
    if (shot)
      frames.push({ png: shot.toString("base64"), t: Date.now() - start });
    await setTimeout(every);
  }
  const vw = page.viewportSize()?.width ?? 1440;
  const w = vw > 800 ? 480 : 180;
  const lay = await browser.newPage({ viewport: { width: 400, height: 300 } });
  await lay.setContent(
    `<body style="margin:0;background:#222;font:11px monospace;color:#eee;display:grid;grid-template-columns:repeat(${columns},${w}px);gap:6px;padding:6px;width:max-content">${frames
      .map(
        (f) =>
          `<figure style="margin:0"><img style="width:100%;display:block" src="data:image/jpeg;base64,${f.png}"><figcaption>${f.t} ms</figcaption></figure>`,
      )
      .join("")}</body>`,
  );
  await lay.screenshot({
    path: join(out, `${name}-${file}.jpg`),
    type: "jpeg",
    quality: 80,
    fullPage: true,
  });
  await lay.close();
  console.log(join(out, `${name}-${file}.jpg`));
}

for (const [size, options] of Object.entries({
  desktop: { viewport: { width: 1440, height: 900 } },
  phone: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
})) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const media: string[] = [];
  page.on("request", (r) => {
    if (
      /\.(mp3|wav|ogg|m4a|woff2?|ttf|otf|png|jpe?g|webp|avif|svg)(\?|$)/i.test(
        r.url(),
      )
    )
      media.push(r.url());
  });
  // 1 · the load, from navigation.
  const nav = page.goto(url, { waitUntil: "commit", timeout: 60000 });
  await nav;
  await film(page, `${size}-load`, 7000, 350, 4);
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await setTimeout(1500);
  await page.screenshot({ path: join(out, `${name}-${size}-rest.png`) });
  // 2 · one scroll step (a wheel flick on desktop, a swipe on the phone).
  await film(page, `${size}-scroll`, 2200, 120, 6, async () => {
    if (size === "desktop") {
      await page.mouse.move(720, 450);
      await page.mouse.wheel(0, 500);
    } else {
      await page.evaluate(() => {
        window.scrollBy({ top: innerHeight, behavior: "smooth" });
      });
    }
  });
  await setTimeout(800);
  await page.screenshot({
    path: join(out, `${name}-${size}-after-scroll.png`),
  });
  if (size === "desktop") {
    // 3 · a hover over the thing in focus, then the cursor.
    await page.mouse.move(720, 470, { steps: 8 });
    await setTimeout(900);
    await page.screenshot({ path: join(out, `${name}-${size}-hover.png`) });
    const cursor = await page.evaluate(() => {
      const el = document.elementFromPoint(720, 470);
      return el
        ? `${el.tagName}.${String(el.className).slice(0, 60)} cursor=${getComputedStyle(el).cursor}`
        : "";
    });
    // 4 · the tokens.
    const tokens = await page.evaluate(() => {
      const css = (el: Element | null) => {
        if (!el) return null;
        const s = getComputedStyle(el);
        return {
          text: (el.textContent ?? "").trim().slice(0, 40),
          font: s.fontFamily,
          size: s.fontSize,
          weight: s.fontWeight,
          lh: s.lineHeight,
          ls: s.letterSpacing,
          tt: s.textTransform,
          color: s.color,
        };
      };
      const body = getComputedStyle(document.body);
      const texts = [
        ...document.querySelectorAll("h1,h2,h3,p,a,span,dt,dd,div"),
      ]
        .filter(
          (el) =>
            el.children.length === 0 &&
            (el.textContent ?? "").trim().length > 1 &&
            el.getBoundingClientRect().width > 0 &&
            el.getBoundingClientRect().top < innerHeight &&
            el.getBoundingClientRect().top >= 0,
        )
        .slice(0, 40)
        .map(css);
      const overlays = [...document.querySelectorAll("body *")]
        .filter((el) => {
          const s = getComputedStyle(el);
          return (
            (s.position === "fixed" || s.position === "absolute") &&
            el.getBoundingClientRect().width >= innerWidth * 0.9 &&
            el.getBoundingClientRect().height >= innerHeight * 0.9
          );
        })
        .map((el) => {
          const s = getComputedStyle(el);
          return `${el.tagName}.${String(el.className).slice(0, 50)} bg=${s.backgroundImage.slice(0, 80)} blend=${s.mixBlendMode} op=${s.opacity} z=${s.zIndex} pe=${s.pointerEvents}`;
        });
      const fonts = [...document.fonts].map(
        (f) => `${f.family} ${f.weight} ${f.style} ${f.status}`,
      );
      const audio = [...document.querySelectorAll("audio,video")].map(
        (m) => (m as HTMLMediaElement).currentSrc || m.outerHTML.slice(0, 100),
      );
      return {
        title: document.title,
        bodyBg: body.backgroundColor,
        bodyImg: body.backgroundImage.slice(0, 120),
        htmlBg: getComputedStyle(document.documentElement).backgroundColor,
        cursorBody: body.cursor,
        scrollBehavior: getComputedStyle(document.documentElement)
          .scrollBehavior,
        scrollbar: getComputedStyle(document.documentElement).scrollbarWidth,
        smooth:
          Boolean((window as unknown as { lenis?: unknown }).lenis) ||
          Boolean(document.querySelector("[data-lenis-prevent], .lenis")) ||
          document.documentElement.className,
        canvases: [...document.querySelectorAll("canvas")].map(
          (c) => `${c.width}x${c.height} ${getComputedStyle(c).position}`,
        ),
        fonts: [...new Set(fonts)],
        audio,
        overlays,
        texts,
      };
    });
    writeFileSync(
      join(out, `${name}-tokens.json`),
      JSON.stringify(
        { cursor, ...tokens, media: [...new Set(media)].slice(0, 80) },
        null,
        1,
      ),
    );
    // 5 · a click on the thing in focus.
    await film(page, `${size}-click`, 3000, 200, 5, async () => {
      await page.mouse.click(720, 470);
    });
    await setTimeout(1000);
    await page.screenshot({
      path: join(out, `${name}-${size}-after-click.png`),
    });
  }
  await context.close();
}
await browser.close();
