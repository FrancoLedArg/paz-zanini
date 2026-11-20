// PROTOTYPE (#75): side-by-side audit pairs, and a zoom of each site's paper.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
const [dir = "audit", out = "audit"] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
const img = (f: string, style = "") =>
  `<img style="width:100%;display:block;${style}" src="data:image/${f.endsWith("png") ? "png" : "jpeg"};base64,${readFileSync(join(dir, f)).toString("base64")}">`;
const pairs: [string, string, string, string, string][] = [
  [
    "rest",
    "a24-desktop-hover.png",
    "A24 · en reposo (hover)",
    "ours-desktop-rest.png",
    "Paz Zanini · en reposo",
  ],
  [
    "flick",
    "a24-desktop-after-scroll.png",
    "A24 · tras un giro de rueda",
    "ours-desktop-after-scroll.png",
    "Paz Zanini · tras un giro de rueda",
  ],
  [
    "detail",
    "a24-desktop-after-click.png",
    "A24 · la ficha de la película",
    "ours-desktop-after-click.png",
    "Paz Zanini · tras un clic (cayó entre libros)",
  ],
];
for (const [name, a, la, b, lb] of pairs) {
  await page.setContent(
    `<body style="margin:0;background:#222;color:#eee;font:13px monospace;display:grid;grid-template-columns:720px 720px;gap:8px;padding:8px;width:max-content"><figure style="margin:0">${img(a)}<figcaption>${la}</figcaption></figure><figure style="margin:0">${img(b)}<figcaption>${lb}</figcaption></figure></body>`,
  );
  await page.screenshot({
    path: join(out, `pair-${name}.jpg`),
    fullPage: true,
    type: "jpeg",
    quality: 82,
  });
}
// Each frame magnified 4x on the object: A24 lays its grain over the 3D too.
await page.setContent(`<body style="margin:0;background:#222;color:#eee;font:13px monospace;display:grid;grid-template-columns:400px 400px;gap:8px;padding:8px;width:max-content">
<figure style="margin:0"><div style="width:400px;height:240px;overflow:hidden">${img("a24-desktop-rest.png", "width:5760px;transform:translate(-2200px,-2400px);image-rendering:pixelated")}</div><figcaption>A24 · ×4 sobre el disco: el grano (20 %) cubre también el 3D</figcaption></figure>
<figure style="margin:0"><div style="width:400px;height:240px;overflow:hidden">${img("ours-desktop-rest.png", "width:5760px;transform:translate(-2200px,-2400px);image-rendering:pixelated")}</div><figcaption>Paz Zanini · ×4 sobre la Tapa: liso, digital</figcaption></figure></body>`);
await page.screenshot({
  path: join(out, "pair-paper.jpg"),
  fullPage: true,
  type: "jpeg",
  quality: 90,
});
await browser.close();
