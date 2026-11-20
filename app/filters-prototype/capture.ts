// PROTOTYPE (#75): screenshot every option and lay them out as strips, one per question.
// node app/filters-prototype/capture.ts <base-url> <out-dir>
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout } from "node:timers/promises";
import { chromium, type Page } from "@playwright/test";

const [base = "http://localhost:5174", out = "shots"] = process.argv.slice(2);
const raw = join(out, "raw");
mkdirSync(raw, { recursive: true });

const GPU_ARGS = [
  "--ignore-gpu-blocklist",
  "--enable-gpu",
  "--use-angle=metal",
];
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
} as const;
type Size = keyof typeof SIZES;

const DEFAULTS = {
  names: "corto",
  mark: "raya",
  phone: "fila",
  words: "ninguna",
  menu: "desplegable",
};
const QUESTIONS = {
  names: ["corto", "completo", "numerales"],
  mark: ["raya", "punto", "tinta"],
  phone: ["fila", "una-fila", "actual"],
  words: ["ninguna", "leyenda"],
  menu: ["desplegable", "enlaces", "pie"],
};

const browser = await chromium.launch({ args: GPU_ARGS });
const errors: string[] = [];

async function open(size: Size) {
  const context = await browser.newContext(SIZES[size]);
  await context.addInitScript(() => {
    sessionStorage.setItem("loader-seen", "1");
  });
  const page = await context.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`${size}: ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`${size}: ${e.message}`));
  return page;
}

async function settle(page: Page) {
  await page.waitForFunction(
    () => !document.querySelector('[aria-busy="true"]'),
    null,
    { timeout: 30000 },
  );
  await setTimeout(900);
}

async function shot(
  page: Page,
  file: string,
  path: string,
  params: Record<string, string>,
  then?: (page: Page) => Promise<void>,
) {
  const url = new URL(path, base);
  for (const [k, v] of Object.entries({ ...params, bar: "0" }))
    url.searchParams.set(k, v);
  await page.goto(url.href, { waitUntil: "networkidle" });
  await settle(page);
  if (then) {
    await then(page);
    await setTimeout(700);
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  if (overflow) errors.push(`${file}: scrolls sideways`);
  await page.screenshot({
    path: join(raw, `${file}.jpg`),
    type: "jpeg",
    quality: 80,
  });
  return `${file}.jpg`;
}

interface Cell {
  file: string;
  caption: string;
}
const strips: Record<string, Cell[]> = {};
const add = (strip: string, file: string, caption: string) => {
  (strips[strip] ??= []).push({ file, caption });
};

const pages = Object.fromEntries(
  await Promise.all(
    (Object.keys(SIZES) as Size[]).map(
      async (s) => [s, await open(s)] as const,
    ),
  ),
) as Record<Size, Page>;

for (const [q, values] of Object.entries(QUESTIONS)) {
  for (const v of values) {
    const params = { ...DEFAULTS, [q]: v };
    for (const size of ["desktop", "390", "320"] as Size[]) {
      // The phone options don't change the desktop.
      if (q === "phone" && size === "desktop") continue;
      const path =
        q === "names" && size !== "320"
          ? "/colecciones/ciencia-de-datos-desde-cero"
          : "/";
      const file = await shot(pages[size], `${q}-${v}-${size}`, path, params);
      add(
        `${q}-${size === "desktop" ? "desktop" : "phone"}`,
        file,
        `${q}=${v} · ${size}`,
      );
    }
  }
}

// Open states: the dropdown, the "actual" disclosure.
for (const size of ["desktop", "390"] as Size[]) {
  const file = await shot(
    pages[size],
    `menu-desplegable-open-${size}`,
    "/",
    DEFAULTS,
    async (page) => {
      await page.getByRole("button", { name: "Índice" }).click();
    },
  );
  add("menu-open", file, `menu=desplegable abierto · ${size}`);
}
add(
  "menu-open",
  await shot(
    pages["390"],
    "phone-actual-open-390",
    "/",
    { ...DEFAULTS, phone: "actual" },
    async (page) => {
      await page.locator("summary").click();
    },
  ),
  "phone=actual abierto · 390",
);

// The menu on the Manual and info pages.
for (const v of QUESTIONS.menu) {
  for (const size of ["desktop", "390"] as Size[]) {
    const path = "/autor";
    add(
      "menu-pages",
      await shot(pages[size], `menu-${v}-autor-${size}`, path, {
        ...DEFAULTS,
        menu: v,
      }),
      `menu=${v} · /autor · ${size}`,
    );
  }
}
const manualPath = await (async () => {
  await pages.desktop.goto(base + "/?bar=0", { waitUntil: "networkidle" });
  return pages.desktop
    .locator('ol[aria-label="Manuales"] a')
    .first()
    .getAttribute("href");
})();
for (const v of QUESTIONS.menu) {
  add(
    "menu-manual",
    await shot(
      pages.desktop,
      `menu-${v}-manual-desktop`,
      manualPath ?? "/",
      { ...DEFAULTS, menu: v },
      async (page) => {
        await page.evaluate(() => {
          scrollTo(0, document.documentElement.scrollHeight);
        });
      },
    ),
    `menu=${v} · Manual, al pie · desktop`,
  );
}

// One combined frame per size of the recommended mix, for the head of the comment.
for (const size of ["desktop", "390", "320"] as Size[])
  add(
    "defaults",
    await shot(pages[size], `defaults-${size}`, "/", DEFAULTS),
    `por defecto · ${size}`,
  );

// Strips: one image per row of options, laid out in a page and shot.
const layout = await browser.newPage({ viewport: { width: 400, height: 300 } });
for (const [name, cells] of Object.entries(strips)) {
  const html = `<body style="margin:0;background:#222;font:13px ui-monospace,monospace;color:#eee;display:flex;align-items:flex-start;gap:10px;padding:10px;width:max-content">${cells
    .map(
      (c) =>
        `<figure style="margin:0;width:${c.file.includes("desktop") ? 640 : 220}px"><img style="width:100%;display:block" src="data:image/jpeg;base64,${readFileSync(join(raw, c.file)).toString("base64")}"><figcaption style="padding-top:6px">${c.caption}</figcaption></figure>`,
    )
    .join("")}</body>`;
  await layout.setContent(html);
  await layout.waitForLoadState("load");
  await layout.screenshot({
    path: join(out, `${name}.jpg`),
    type: "jpeg",
    quality: 82,
    fullPage: true,
  });
  console.log(join(out, `${name}.jpg`));
}

writeFileSync(join(out, "errors.txt"), errors.join("\n"));
console.log(
  errors.length
    ? `ERRORS:\n${errors.join("\n")}`
    : "no console errors, nothing scrolls sideways",
);
await browser.close();
