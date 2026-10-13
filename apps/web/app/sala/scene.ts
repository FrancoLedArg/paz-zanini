import {
  ACESFilmicToneMapping, CanvasTexture, DirectionalLight, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  PCFShadowMap, PerspectiveCamera, PlaneGeometry, PMREMGenerator, Raycaster, Scene, SRGBColorSpace, Vector2, Vector3, WebGLRenderer,
  type Object3D,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Documento } from "@paz/content";
import { motif } from "@paz/content/motif";
import { isDark } from "../client";
import { ndc, progress, viewport } from "./view";

// Meters. The cabinet stands at the origin.
const W = 0.5, H = 1.36, D = 0.62, BASE = 0.07, TOP = 0.035, GAP = 0.008;
const DRAWER = (H - BASE - TOP - GAP * 4) / 5;
// How far a drawer slides out: ajar while the camera passes it, a bit more under the pointer, open on a click.
const AJAR = 0.05, PEEK = 0.09, OPEN = 0.42;
const TRAY = 0.5, TW = W - 0.06, WALL = 0.008;
// A Carpeta standing in the tray, and how far it rises under the pointer; the sheet inside it rises further, out of it.
const FOLDER = 0.17, LIFT = 0.05, SHEET = 0.15, SHEET_LIFT = 0.1;

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const box = (w: number, h: number, d: number, r = 0.006) => new RoundedBoxGeometry(w, h, d, 3, r);
const mesh = (g: Mesh["geometry"], m: Mesh["material"], x = 0, y = 0, z = 0) => {
  const o = new Mesh(g, m);
  o.position.set(x, y, z);
  o.castShadow = o.receiveShadow = true;
  return o;
};

/** The baked floor shadow: a soft dark ellipse drawn once on a canvas. */
function blob(w: number, d: number) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(0,0,0,.55)");
  r.addColorStop(0.55, "rgba(0,0,0,.3)");
  r.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  const p = new Mesh(new PlaneGeometry(w, d), new MeshBasicMaterial({ map: new CanvasTexture(c), transparent: true, depthWrite: false }));
  p.rotation.x = -Math.PI / 2;
  p.position.y = 0.001;
  return p;
}

export type Label = { numeral: string; nombre: string; rango: string };

/** A Rótulo like the DOM one: numeral in red, name, range. Drawn with the site's fonts. */
function drawLabel(c: HTMLCanvasElement, l: Label) {
  const g = c.getContext("2d")!;
  const { width: w, height: h } = c;
  g.fillStyle = css("--paper");
  g.fillRect(0, 0, w, h);
  g.textBaseline = "alphabetic";
  const fit = (font: string, size: number, text: string, max: number) => {
    let s = size;
    do g.font = font.replace("$", `${s}px`); while (g.measureText(text).width > max && --s > 8);
  };
  g.fillStyle = css("--stamp");
  fit(`700 $ ${css("--f-type")}`, h * 0.19, l.numeral, w * 0.9);
  g.letterSpacing = `${h * 0.025}px`;
  g.fillText(l.numeral.toUpperCase(), w * 0.06, h * 0.3);
  g.letterSpacing = "0px";
  g.fillStyle = css("--ink");
  fit(`700 $ ${css("--f-body")}`, h * 0.3, l.nombre, w * 0.88);
  g.fillText(l.nombre, w * 0.06, h * 0.64);
  g.fillStyle = css("--ink-soft");
  fit(`400 $ ${css("--f-type")}`, h * 0.19, l.rango, w * 0.88);
  g.fillText(l.rango, w * 0.06, h * 0.88);
}

/** A Carpeta as the scene needs it: where it opens, and what its cover shows. */
export type CarpetaLabel = { href: string; rotulo: string; titulo: string; tipo: string } & Partial<Pick<Documento, "motivo" | "faltante">>;

const canvasTex = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return { c, tex };
};

/** The signatura on a Carpeta's tab. */
function drawTab(c: HTMLCanvasElement, k: CarpetaLabel) {
  const g = c.getContext("2d")!;
  g.fillStyle = css("--manila");
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = css("--ink");
  g.font = `700 ${c.height * 0.62}px ${css("--f-type")}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(k.rotulo, c.width / 2, c.height * 0.55);
}

// The Motivo's own rules from globals.css, with the theme's colors: an SVG drawn as an image sees no page CSS.
const motifCss = () =>
  `svg{--ink:${css("--ink")};--stamp:${css("--stamp")};--paper:${css("--paper")}}` +
  `.m-ink{fill:none;stroke:var(--ink);stroke-width:1.2}.m-fill{fill:var(--ink);opacity:.14}.m-acc{fill:none;stroke:var(--stamp);stroke-width:1.5}` +
  `.m-accf{fill:var(--stamp);opacity:.4}.m-dot{fill:var(--ink)}.m-hol{fill:var(--paper);stroke:var(--ink);stroke-width:1.2}` +
  `.m-txt{fill:var(--ink);font-family:"Courier New",monospace;font-size:9px}.m-dash{stroke-dasharray:3 3}` +
  `.m-f1{fill:var(--ink);opacity:.62}.m-f2{fill:var(--ink);opacity:.3}.m-f3{fill:var(--ink);opacity:.1}`;

/** The sheet inside a Carpeta, lying landscape: signatura and title on the left, the Motivo (or typed lines) on the right. */
function drawCover(c: HTMLCanvasElement, k: CarpetaLabel, done: () => void) {
  const g = c.getContext("2d")!;
  const { width: w, height: h } = c;
  g.fillStyle = css("--paper");
  g.fillRect(0, 0, w, h);
  g.textBaseline = "alphabetic";
  g.fillStyle = css("--stamp");
  g.font = `700 ${h * 0.085}px ${css("--f-type")}`;
  g.fillText(`${k.rotulo} · ${k.tipo.split(" ·")[0].toUpperCase()}`, w * 0.04, h * 0.16);
  g.fillRect(w * 0.04, h * 0.21, w * 0.44, 2);
  g.fillStyle = css("--ink");
  g.font = `400 ${h * 0.12}px ${css("--f-body")}`;
  // The title, word-wrapped into the left half, four lines at most.
  const lines: string[] = [];
  for (const word of k.titulo.split(" ")) {
    const last = lines.at(-1);
    if (last && g.measureText(`${last} ${word}`).width <= w * 0.44) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  lines.slice(0, 4).forEach((l, i) => g.fillText(i === 3 && lines.length > 4 ? `${l}…` : l, w * 0.04, h * (0.38 + i * 0.15)));
  const fig = { x: w * 0.52, y: h * 0.12, w: w * 0.44, h: w * 0.44 * (140 / 240) };
  if (!k.motivo) {
    g.fillStyle = css("--rule");
    for (let i = 0; i < 6; i++) g.fillRect(fig.x, fig.y + 8 + i * (fig.h / 6), fig.w * (i % 3 === 2 ? 0.6 : 1), 2);
    return done();
  }
  const svg = motif({ signatura: k.rotulo, motivo: k.motivo, faltante: k.faltante })
    .replace("<svg ", `<svg xmlns="http://www.w3.org/2000/svg" width="${fig.w}" height="${fig.h}" `)
    .replace(/var\(--stamp\)/g, css("--stamp"))
    .replace(/(<svg[^>]*>)/, `$1<style>${motifCss()}</style>`);
  const img = new Image();
  img.onload = () => { g.drawImage(img, fig.x, fig.y, fig.w, fig.h); done(); };
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * `cajones[i].carpetas` are drawer i's Carpetas, front to back; `go` follows one's href.
 * Resolves once the labels are drawn with the site's fonts, so the first frame never shows blank Rótulos.
 */
export async function mountSala(canvas: HTMLCanvasElement, cajones: (Label & { carpetas: CarpetaLabel[] })[], go: (href: string) => void) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.setClearColor(0, 0);
  renderer.autoClear = false;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  // The lamp: one warm light, upper left, its soft shadow map framed on the Archivador.
  const lamp = new DirectionalLight(0xffdcb0);
  lamp.position.set(-1.2, 3.4, 2.6);
  lamp.target.position.set(0, 0.6, 0);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(2048, 2048);
  lamp.shadow.radius = 6;
  lamp.shadow.bias = -0.0004;
  lamp.shadow.normalBias = 0.01;
  Object.assign(lamp.shadow.camera, { left: -1, right: 1, top: 1.2, bottom: -1.2, near: 0.5, far: 7 });
  scene.add(lamp, lamp.target);

  // Painted steel: a baked enamel, so only a little metallic.
  const steel = new MeshStandardMaterial({ metalness: 0.3, roughness: 0.45 });
  const steelLo = new MeshStandardMaterial({ metalness: 0.3, roughness: 0.6 });
  const chrome = new MeshStandardMaterial({ metalness: 0.95, roughness: 0.28 });
  const rim = new MeshStandardMaterial({ metalness: 0.85, roughness: 0.35 });
  const manila = new MeshStandardMaterial({ metalness: 0, roughness: 0.85 });

  // ---- Archivador ----
  const cabinet = new Group();
  cabinet.add(mesh(box(W, H - BASE, D, 0.012), steel, 0, BASE + (H - BASE) / 2, 0));
  cabinet.add(mesh(box(W + 0.012, TOP * 0.6, D + 0.012, 0.006), steel, 0, H - TOP * 0.3, 0));
  cabinet.add(mesh(box(W - 0.04, BASE, D - 0.06, 0.004), steelLo, 0, BASE / 2, -0.02));
  cabinet.add(blob(W * 2, D * 1.8));

  const labelGeo = new PlaneGeometry(0.29, 0.1);
  // The tray's floor and rim, from the drawer's center.
  const FLOOR = -0.005 - (DRAWER - 0.05) / 2, RIM = FLOOR + 0.03;
  const drawers = Array.from({ length: 5 }, (_, i) => {
    const g = new Group();
    const y = H - TOP - GAP - DRAWER / 2 - i * (DRAWER + GAP);
    g.position.set(0, y, D / 2);
    g.add(mesh(box(W - 0.024, DRAWER, 0.022, 0.006), steel, 0, 0, 0.011));
    const top = RIM, bot = FLOOR, mid = (top + bot) / 2;
    g.add(mesh(box(TW, 0.006, TRAY, 0.002), steelLo, 0, bot + 0.003, -TRAY / 2));
    for (const x of [-1, 1]) g.add(mesh(box(WALL, top - bot, TRAY, 0.002), steelLo, x * (TW / 2 - WALL / 2), mid, -TRAY / 2));
    g.add(mesh(box(TW, top - bot, WALL, 0.002), steelLo, 0, mid, -TRAY + WALL / 2));
    // The Carpetas, front to back over the part of the tray that slides out, leaning back a little; tabs staggered in three.
    // Each one: the back board with its tab, the sheet with the Documento's cover, and a lower front flap it peeks over.
    const ks = cajones[i]?.carpetas ?? [], n = ks.length;
    const folders = ks.map((k, j) => {
      const f = new Group();
      f.position.set(0, bot + 0.006, -0.03 - (j * (OPEN - 0.08)) / Math.max(1, n - 1));
      f.rotation.x = -0.1 + Math.sin(j * 2.3) * 0.04;
      const tx = ((j % 3) - 1) * ((TW - 0.14) / 2);
      f.add(mesh(box(TW - 0.03, FOLDER, 0.003, 0.001), manila, 0, FOLDER / 2, 0));
      f.add(mesh(box(0.08, 0.022, 0.003, 0.001), manila, tx, FOLDER + 0.011, 0));
      const tab = canvasTex(160, 40), cover = canvasTex(512, 202);
      const tabLabel = new Mesh(new PlaneGeometry(0.074, 0.0185), new MeshStandardMaterial({ map: tab.tex, roughness: 0.85 }));
      tabLabel.position.set(tx, FOLDER + 0.011, 0.0016);
      const sheet = mesh(new PlaneGeometry(TW - 0.06, SHEET), new MeshStandardMaterial({ map: cover.tex, roughness: 0.9 }), 0, 0.012 + SHEET / 2, 0.003);
      f.add(tabLabel, sheet, mesh(box(TW - 0.03, FOLDER - 0.03, 0.003, 0.001), manila, 0, (FOLDER - 0.03) / 2, 0.006));
      g.add(f);
      return { g: f, y0: f.position.y, z: 0, to: 0, k, tab, cover, sheet: { g: sheet, y0: sheet.position.y, z: 0, to: 0 } };
    });
    g.add(mesh(box(0.16, 0.02, 0.028, 0.008), chrome, 0, -DRAWER * 0.33, 0.034));
    g.add(mesh(box(0.306, 0.116, 0.006, 0.002), rim, 0, DRAWER * 0.12, 0.024));
    const c = document.createElement("canvas");
    c.width = 512; c.height = 182;
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 4;
    const label = new Mesh(labelGeo, new MeshStandardMaterial({ map: tex, roughness: 0.85, color: 0xc4c4c4 }));
    label.position.set(0, DRAWER * 0.12, 0.0275);
    g.add(label);
    cabinet.add(g);
    return { g, canvas: c, tex, z: 0, to: 0, y, folders };
  });
  scene.add(cabinet);

  // The Sala's state: the drawer clicked open, the drawer and Carpeta under the pointer, the page that scrolls the camera.
  let open = -1, hover = -1, carpeta = -1, track: HTMLElement | null = null, snap = false;

  // The cabinet's camera: up close, three-quarters from above and the right, sliding down the front as the page scrolls;
  // steeper over an open drawer, to see into it. Aimed at `aimAt`, which eases toward `aimTo`.
  const cabCam = new PerspectiveCamera(30, 1, 0.1, 20);
  const aimAt = new Vector3(0, drawers[0].y, D / 2), aimTo = aimAt.clone(), steep = { z: 0, to: 0 };
  const DIR = new Vector3(0.62, 0.5, 1).normalize(), DIR_IN = new Vector3(0.4, 1.1, 1).normalize();
  const aim = (w: number, h: number) => {
    const c = cabCam, aspect = w / h;
    // Three quarters of a meter of cabinet top to bottom; on a narrow screen, at least 0.8 m across.
    const span = Math.max(0.75, 0.8 / aspect);
    c.position.copy(aimAt).addScaledVector(DIR.clone().lerp(DIR_IN, steep.z).normalize(), span / 2 / Math.tan((c.fov * Math.PI) / 360));
    c.lookAt(aimAt);
    // Wide: right of center, the top left is the text's. Narrow: centered, below the text.
    if (aspect > 1) c.setViewOffset(w, h, -w * 0.22, 0, w, h);
    else c.setViewOffset(w, h, 0, -h * 0.2, w, h);
  };

  let cabEl: HTMLElement | null = null;

  const retheme = () => {
    const dark = isDark();
    steel.color.setStyle(css("--steel"));
    steelLo.color.setStyle(css("--steel-lo"));
    chrome.color.setStyle(css("--frame"));
    rim.color.setStyle(css("--frame"));
    manila.color.setStyle(css("--manila"));
    // La sala de noche: the lamp stays on, the room around it goes dim.
    scene.environmentIntensity = dark ? 0.35 : 0.6;
    lamp.intensity = 2.6;
  };

  let raf = 0, last = 0, attached = false, onFirstFrame: (() => void) | null = null;
  const frame = (t: number) => {
    raf = 0;
    const dt = Math.min(0.05, (t - (last || t)) / 1000);
    last = t;
    let moving = false;
    const ease = matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 1 - Math.exp(-dt * 14);
    if (track) {
      // The page scroll walks the camera from the top drawer to the bottom one; the drawers it passes stand ajar.
      const r = track.getBoundingClientRect();
      const y = drawers[0].y + (drawers[4].y - drawers[0].y) * progress(r, innerHeight);
      drawers.forEach((d, i) => {
        const near = Math.max(0, 1 - Math.abs(d.y - y) / (DRAWER + GAP));
        d.to = i === open ? OPEN : Math.max(AJAR * near, i === hover ? PEEK : 0);
        d.folders.forEach((f, j) => {
          const on = i === open && j === carpeta;
          f.to = on ? LIFT : 0;
          f.sheet.to = on ? SHEET_LIFT : 0;
        });
      });
      const o = drawers[open];
      aimTo.set(0, o ? o.y : y - 0.08, o ? D / 2 + OPEN * 0.6 : D / 2);
      steep.to = o ? 1 : 0;
      if (snap) { aimAt.copy(aimTo); snap = false; }
      aimAt.lerp(aimTo, ease);
      if (aimAt.distanceToSquared(aimTo) > 1e-8) moving = true;
      else aimAt.copy(aimTo);
    }
    for (const d of [...drawers, ...drawers.flatMap((d) => d.folders.flatMap((f) => [f, f.sheet])), steep]) {
      d.z += (d.to - d.z) * ease;
      if (Math.abs(d.to - d.z) > 1e-4) moving = true;
      else d.z = d.to;
    }
    drawers.forEach((d) => {
      d.g.position.z = D / 2 + d.z;
      d.folders.forEach((f) => {
        f.g.position.y = f.y0 + f.z;
        f.sheet.g.position.y = f.sheet.y0 + f.sheet.z;
      });
    });

    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (canvas.width !== Math.round(cw * renderer.getPixelRatio()) || canvas.height !== Math.round(ch * renderer.getPixelRatio())) renderer.setSize(cw, ch, false);
    renderer.setScissorTest(false);
    renderer.clear();
    renderer.setScissorTest(true);
    const r = cabEl && viewport(cabEl.getBoundingClientRect(), cw, ch);
    if (r) {
      aim(r.w, r.h);
      cabCam.updateProjectionMatrix();
      renderer.setViewport(r.x, r.y, r.w, r.h);
      renderer.setScissor(r.x, r.y, r.w, r.h);
      renderer.render(scene, cabCam);
    }
    if (onFirstFrame) { onFirstFrame(); onFirstFrame = null; }
    if (moving) invalidate();
    else last = 0;
  };
  const invalidate = () => { if (!raf && attached && !document.hidden) raf = requestAnimationFrame(frame); };

  let paints = 0;
  const paint = () => {
    retheme();
    drawers.forEach((d, i) => { if (cajones[i]) drawLabel(d.canvas, cajones[i]); d.tex.needsUpdate = true; });
    // A cover's Motivo loads as an image; one from an earlier theme that lands late is dropped.
    const gen = ++paints;
    for (const f of drawers.flatMap((d) => d.folders)) {
      drawTab(f.tab.c, f.k);
      f.tab.tex.needsUpdate = true;
      drawCover(f.cover.c, f.k, () => { if (gen === paints) { f.cover.tex.needsUpdate = true; invalidate(); } });
    }
    invalidate();
  };
  const families = ["--f-type", "--f-body"].map((v) => css(v));
  await Promise.all(families.flatMap((f) => [document.fonts.load(`400 20px ${f}`), document.fonts.load(`700 20px ${f}`)])).catch(() => {});
  await document.fonts.ready;
  paint();
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", paint);
  new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  document.addEventListener("visibilitychange", invalidate);

  const raycaster = new Raycaster();
  /** What's under the pointer: the drawer `i`, and the Carpeta `j` when it's one of the open drawer's. */
  const pick = (e: MouseEvent, el: HTMLElement) => {
    const p = ndc(e.clientX, e.clientY, el.getBoundingClientRect());
    raycaster.setFromCamera(new Vector2(p.x, p.y), cabCam);
    const hit = raycaster.intersectObjects(drawers.map((d) => d.g))[0]?.object ?? null;
    const owner = (list: { g: Object3D }[]) => {
      let o: Object3D | null = hit;
      while (o && !list.some((x) => x.g === o)) o = o.parent;
      return list.findIndex((x) => x.g === o);
    };
    return { i: owner(drawers), j: open < 0 ? -1 : owner(drawers[open].folders) };
  };
  /** Opens drawer `o` (-1: none) and lifts its Carpeta `j`; the page shows their text through a "sala" event. */
  const show = (o: number, j: number) => {
    if (o === open && j === carpeta) return;
    open = o;
    carpeta = j;
    dispatchEvent(new CustomEvent("sala", { detail: { cajon: o, carpeta: j } }));
    invalidate();
  };

  return {
    /** Binds the scene to the Sala page now in the DOM. Returns the undo. */
    attach(cab: HTMLElement, ready: () => void) {
      const links = [...cab.querySelectorAll<HTMLAnchorElement>(".dfront")];
      cabEl = cab;
      track = cab.closest("main");
      attached = snap = true;
      onFirstFrame = ready;
      invalidate();
      const point = (i: number) => { hover = i; invalidate(); };
      let touch = false, openedAt = 0;

      const ac = new AbortController();
      const on = <K extends keyof HTMLElementEventMap>(t: EventTarget, k: K | string, f: (e: HTMLElementEventMap[K]) => void) =>
        t.addEventListener(k, f as EventListener, { signal: ac.signal, passive: true });
      on(cab, "pointermove", (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        const { i, j } = pick(e, cab);
        cab.style.cursor = i < 0 ? "" : "pointer";
        point(i);
        show(open, j);
      });
      on(cab, "pointerleave", () => { point(-1); show(open, -1); });
      on(cab, "pointerdown", (e: PointerEvent) => (touch = e.pointerType !== "mouse"));
      // A click on a drawer opens it (or closes it, if open) right there; on a Carpeta, follows it. On touch the first tap
      // on a Carpeta only lifts it and shows its Ficha. Keyboard users get the DOM drawers, which link to the 2D Cajón.
      on(cab, "click", (e: MouseEvent) => {
        if (e.target !== cab) return;
        const { i, j } = pick(e, cab);
        if (j >= 0) return touch && j !== carpeta ? show(open, j) : go(cajones[open].carpetas[j].href);
        openedAt = scrollY;
        show(i === open ? -1 : i, -1);
      });
      on(window, "keydown", (e: KeyboardEvent) => e.key === "Escape" && show(-1, -1));
      on(window, "scroll", () => {
        if (open >= 0 && Math.abs(scrollY - openedAt) > 120) show(-1, -1);
        invalidate();
      });
      // A focused DOM drawer peeks out, and the page scrolls the camera to it.
      on(cab, "focusin", (e: FocusEvent) => {
        const i = links.indexOf(e.target as HTMLAnchorElement), r = track!.getBoundingClientRect();
        point(i);
        if (i >= 0) scrollTo({ top: scrollY + r.top + (i / 4) * (r.height - innerHeight), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      });
      on(cab, "focusout", () => point(-1));
      on(window, "resize", invalidate);

      return () => {
        attached = false;
        onFirstFrame = null;
        ac.abort();
        cancelAnimationFrame(raf);
        raf = 0;
        cab.style.cursor = "";
        show(-1, -1);
        hover = -1;
        track = cabEl = null;
        for (const d of [...drawers, ...drawers.flatMap((d) => d.folders.flatMap((f) => [f, f.sheet])), steep]) d.to = d.z = 0;
        renderer.setScissorTest(false);
        renderer.clear();
      };
    },
  };
}

export type Sala = Awaited<ReturnType<typeof mountSala>>;
