import {
  ACESFilmicToneMapping, CanvasTexture, DirectionalLight, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  PCFShadowMap, PerspectiveCamera, PlaneGeometry, PMREMGenerator, Quaternion, Raycaster, Scene, SRGBColorSpace, Vector2, Vector3, WebGLRenderer,
  type Object3D,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { isDark } from "../client";
import { mix, ndc, topDown, viewport, type Plane, type Rect } from "./view";

// Meters. The cabinet stands at the origin; the Fichero sits off to the side, out of the cabinet camera's frustum.
const W = 0.5, H = 1.36, D = 0.62, BASE = 0.07, TOP = 0.035, GAP = 0.008;
const DRAWER = (H - BASE - TOP - GAP * 4) / 5;
const PEEK = 0.06;
// The tray inside each drawer; opened, it slides all the way out so nothing of the cabinet sits over it seen from above.
const TRAY = 0.5, TW = W - 0.06, WALL = 0.008, SLIDE = TRAY + 0.06; // past the handles of the drawers above
const FLY_FOV = 20;
const FICHERO_X = 3;

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

/** Oak grain, drawn once; the token color tints it. */
function grain() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 90; i++) {
    g.strokeStyle = `rgba(60,35,20,${0.04 + Math.random() * 0.1})`;
    g.lineWidth = 0.5 + Math.random() * 1.5;
    const y = Math.random() * 64;
    g.beginPath();
    g.moveTo(0, y);
    g.bezierCurveTo(85, y + Math.random() * 6 - 3, 170, y + Math.random() * 6 - 3, 256, y + Math.random() * 4 - 2);
    g.stroke();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
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

/** Which piece a flight goes into: a drawer by index, or the Fichero. */
export type Target = number | "fichero";

/** One framing of the fly camera. `view` is where the camera's image sits on the canvas (CSS px), `clip` the part actually drawn. */
type Shot = { t: Target; pos: Vector3; quat: Quaternion; fov: number; view: Rect; clip: Rect; slide: number };

// Looking straight down, with the far end of the piece at the top of the screen.
const DOWN = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);
const smooth = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);

/** Resolves once the labels are drawn with the site's fonts, so the first frame never shows blank Rótulos. */
export async function mountSala(canvas: HTMLCanvasElement, cajones: Label[], ficheroLabel: Label) {
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

  // The lamp: one warm light, upper left. Its soft shadow map is framed on the Archivador; the Fichero is lit without one.
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
  const oak = new MeshStandardMaterial({ map: grain(), metalness: 0, roughness: 0.62 });
  const paper = new MeshStandardMaterial({ metalness: 0, roughness: 0.9 });
  const stamp = new MeshStandardMaterial({ metalness: 0, roughness: 0.8 });
  const trayFloor = new MeshBasicMaterial({ toneMapped: false });
  const trayWall = new MeshBasicMaterial({ toneMapped: false });
  const ficheroFloor = new MeshBasicMaterial({ toneMapped: false });

  // ---- Archivador ----
  const cabinet = new Group();
  cabinet.add(mesh(box(W, H - BASE, D, 0.012), steel, 0, BASE + (H - BASE) / 2, 0));
  cabinet.add(mesh(box(W + 0.012, TOP * 0.6, D + 0.012, 0.006), steel, 0, H - TOP * 0.3, 0));
  cabinet.add(mesh(box(W - 0.04, BASE, D - 0.06, 0.004), steelLo, 0, BASE / 2, -0.02));
  cabinet.add(blob(W * 2, D * 1.8));

  const labelGeo = new PlaneGeometry(0.29, 0.1);
  // The tray's floor and rim, from the drawer's center; the rim is the plane a flight lands on. Low walls, so seen from
  // above off-center their inner faces stay about as thin as the DOM tray's border.
  const FLOOR = -0.005 - (DRAWER - 0.05) / 2, RIM = FLOOR + 0.03;
  const drawers = Array.from({ length: 5 }, (_, i) => {
    const g = new Group();
    const y = H - TOP - GAP - DRAWER / 2 - i * (DRAWER + GAP);
    g.position.set(0, y, D / 2);
    g.add(mesh(box(W - 0.024, DRAWER, 0.022, 0.006), steel, 0, 0, 0.011));
    // The tray, unlit and in the DOM Cajón's colors so the last 3D frame matches the first 2D one.
    const top = RIM, bot = FLOOR, mid = (top + bot) / 2;
    g.add(mesh(box(TW, 0.006, TRAY, 0.002), trayFloor, 0, bot + 0.003, -TRAY / 2));
    for (const x of [-1, 1]) g.add(mesh(box(WALL, top - bot, TRAY, 0.002), trayWall, x * (TW / 2 - WALL / 2), mid, -TRAY / 2));
    g.add(mesh(box(TW, top - bot, WALL, 0.002), trayWall, 0, mid, -TRAY + WALL / 2));
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
    return { g, canvas: c, tex, z: 0, to: 0, top: y + RIM };
  });
  scene.add(cabinet);

  // ---- Fichero: an open oak box of Fichas ----
  const FW = 0.34, FH = 0.15, FD = 0.4, T = 0.016;
  const fichero = new Group();
  fichero.position.x = FICHERO_X;
  fichero.add(mesh(box(FW, T, FD, 0.004), oak, 0, T / 2, 0));
  fichero.add(mesh(box(FW, FH, T), oak, 0, FH / 2, FD / 2 - T / 2));
  fichero.add(mesh(box(FW, FH, T), oak, 0, FH / 2, -FD / 2 + T / 2));
  fichero.add(mesh(box(T, FH, FD), oak, -FW / 2 + T / 2, FH / 2, 0));
  fichero.add(mesh(box(T, FH, FD), oak, FW / 2 - T / 2, FH / 2, 0));
  fichero.add(mesh(box(0.12, 0.016, 0.02, 0.007), chrome, 0, FH * 0.28, FD / 2 + 0.01));
  fichero.add(mesh(box(0.2, 0.072, 0.005, 0.002), rim, 0, FH * 0.64, FD / 2 + 0.002));
  const fcanvas = document.createElement("canvas");
  fcanvas.width = 512; fcanvas.height = 182;
  const ftex = new CanvasTexture(fcanvas);
  ftex.colorSpace = SRGBColorSpace;
  const flabel = new Mesh(new PlaneGeometry(0.186, 0.062), new MeshStandardMaterial({ map: ftex, roughness: 0.85, color: 0xc4c4c4 }));
  flabel.position.set(0, FH * 0.64, FD / 2 + 0.0052);
  fichero.add(flabel, blob(FW * 1.9, FD * 1.6));
  const cards = new Group();
  for (let i = 0; i < 14; i++) {
    const card = mesh(box(FW - 2 * T - 0.012, 0.125, 0.0016, 0.001), paper, 0, 0.075, FD / 2 - 0.05 - i * 0.022);
    card.rotation.x = -0.12 + Math.sin(i * 2.3) * 0.05;
    if (i % 4 === 1) card.add(mesh(box(0.05, 0.022, 0.002, 0.001), stamp, -0.08 + (i % 3) * 0.08, 0.07, 0));
    cards.add(card);
  }
  const ffloor = new Mesh(new PlaneGeometry(FW - 2 * T, FD - 2 * T), ficheroFloor);
  ffloor.rotation.x = -Math.PI / 2;
  ffloor.position.y = T + 0.0005;
  fichero.add(cards, ffloor);
  const fcards = { z: 0, to: 0 };
  scene.add(fichero);

  // Cameras: a fixed three-quarter direction per piece, pulled back until its bounding sphere fits the slot.
  const views = [
    { camera: new PerspectiveCamera(26, 1, 0.1, 20), target: new Vector3(0, H / 2, 0.05), dir: new Vector3(0.3, 0.22, 1).normalize(), radius: 0.62, el: null as HTMLElement | null },
    { camera: new PerspectiveCamera(30, 1, 0.1, 20), target: new Vector3(FICHERO_X, FH * 0.55, 0), dir: new Vector3(0.3, 0.55, 1).normalize(), radius: 0.24, el: null as HTMLElement | null },
  ];
  const fit = (v: (typeof views)[number], aspect: number) => {
    const c = v.camera;
    c.aspect = aspect;
    const half = Math.min(c.fov / 2, (Math.atan(Math.tan((c.fov * Math.PI) / 360) * aspect) * 180) / Math.PI);
    c.position.copy(v.target).addScaledVector(v.dir, v.radius / Math.sin((half * Math.PI) / 180));
    c.lookAt(v.target);
    c.updateProjectionMatrix();
  };

  const retheme = () => {
    const dark = isDark();
    steel.color.setStyle(css("--steel"));
    steelLo.color.setStyle(css("--steel-lo"));
    chrome.color.setStyle(css("--frame"));
    rim.color.setStyle(css("--frame"));
    oak.color.setStyle(css(dark ? "--oak-hi" : "--oak"));
    paper.color.setStyle(dark ? "#d9d6cc" : css("--paper"));
    trayFloor.color.setStyle(css("--steel-lo"));
    trayWall.color.setStyle(css("--tray-wall"));
    ficheroFloor.color.setStyle(css("--wall"));
    stamp.color.setStyle(dark ? "#b04437" : css("--stamp"));
    // La sala de noche: the lamp stays on, the room around it goes dim.
    scene.environmentIntensity = dark ? 0.35 : 0.6;
    lamp.intensity = 2.6;
  };

  const flyCam = new PerspectiveCamera(FLY_FOV, 1, 0.05, 30);
  let fly: { a: Shot; b: Shot; t0: number; ms: number; done: (() => void) | null } | null = null;

  let raf = 0, last = 0, attached = false, onFirstFrame: (() => void) | null = null;
  const frame = (t: number) => {
    raf = 0;
    const dt = Math.min(0.05, (t - (last || t)) / 1000);
    last = t;
    let moving = false;
    const ease = matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 1 - Math.exp(-dt * 14);
    for (const d of [...drawers, fcards]) {
      d.z += (d.to - d.z) * ease;
      if (Math.abs(d.to - d.z) > 1e-4) moving = true;
      else d.z = d.to;
    }
    drawers.forEach((d) => (d.g.position.z = D / 2 + d.z));
    cards.position.y = fcards.z;

    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (canvas.width !== Math.round(cw * renderer.getPixelRatio()) || canvas.height !== Math.round(ch * renderer.getPixelRatio())) renderer.setSize(cw, ch, false);
    renderer.setScissorTest(false);
    renderer.clear();
    renderer.setScissorTest(true);
    if (fly) {
      const k = fly.ms ? Math.min(1, (performance.now() - fly.t0) / fly.ms) : 1, e = smooth(k);
      const { a, b } = fly;
      flyCam.position.lerpVectors(a.pos, b.pos, e);
      flyCam.quaternion.slerpQuaternions(a.quat, b.quat, e);
      flyCam.fov = a.fov + (b.fov - a.fov) * e;
      // The camera's image starts in the DOM slot and grows to the whole canvas; the frustum just extends past the slot.
      const view = mix(a.view, b.view, e);
      flyCam.aspect = view.width / view.height;
      flyCam.setViewOffset(view.width, view.height, -view.left, -view.top, cw, ch);
      flyCam.updateProjectionMatrix();
      if (b.t !== "fichero") drawers[b.t].g.position.z = D / 2 + a.slide + (b.slide - a.slide) * e;
      cabinet.visible = b.t !== "fichero";
      fichero.visible = !cabinet.visible;
      const r = viewport(mix(a.clip, b.clip, e), cw, ch);
      if (r) {
        renderer.setViewport(0, 0, cw, ch);
        renderer.setScissor(r.x, r.y, r.w, r.h);
        renderer.render(scene, flyCam);
      }
      if (k < 1) moving = true;
      else if (fly.done) { fly.done(); fly.done = null; }
    } else {
      for (const v of views) {
        const r = v.el && viewport(v.el.getBoundingClientRect(), cw, ch);
        if (!r) continue;
        fit(v, r.w / r.h);
        renderer.setViewport(r.x, r.y, r.w, r.h);
        renderer.setScissor(r.x, r.y, r.w, r.h);
        renderer.render(scene, v.camera);
      }
    }
    if (onFirstFrame) { onFirstFrame(); onFirstFrame = null; }
    if (moving) invalidate();
    else last = 0;
  };
  const invalidate = () => { if (!raf && (attached || fly) && !document.hidden) raf = requestAnimationFrame(frame); };

  const paint = () => {
    retheme();
    drawers.forEach((d, i) => { if (cajones[i]) drawLabel(d.canvas, cajones[i]); d.tex.needsUpdate = true; });
    drawLabel(fcanvas, ficheroLabel);
    ftex.needsUpdate = true;
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
  const pick = (e: PointerEvent | MouseEvent, el: HTMLElement) => {
    const p = ndc(e.clientX, e.clientY, el.getBoundingClientRect());
    raycaster.setFromCamera(new Vector2(p.x, p.y), views[0].camera);
    const hit = raycaster.intersectObjects(drawers.map((d) => d.g))[0]?.object;
    let o: Object3D | null = hit ?? null;
    while (o && !drawers.some((d) => d.g === o)) o = o.parent;
    return drawers.findIndex((d) => d.g === o);
  };

  const screen = (): Rect => ({ left: 0, top: 0, width: canvas.clientWidth, height: canvas.clientHeight });
  const plane = (t: Target): Plane =>
    t === "fichero"
      ? { x0: FICHERO_X - FW / 2, x1: FICHERO_X + FW / 2, y: FH, z: -FD / 2 }
      : { x0: -TW / 2, x1: TW / 2, y: drawers[t].top, z: D / 2 + SLIDE - TRAY };

  return {
    /**
     * A framing of the piece: as it sits in its DOM slot (the whole canvas when there is none), straight down from above it,
     * or straight down landed on a DOM rect (an estimate of where the 2D page puts it when there is none).
     */
    shot(t: Target, at: "slot" | "above" | "landed", el?: Element | null): Shot {
      const full = screen();
      if (at === "slot") {
        const v = views[t === "fichero" ? 1 : 0];
        const r = el?.getBoundingClientRect() ?? full;
        fit(v, r.width / r.height);
        return { t, pos: v.camera.position.clone(), quat: v.camera.quaternion.clone(), fov: v.camera.fov, view: { left: r.left, top: r.top, width: r.width, height: r.height }, clip: full, slide: 0 };
      }
      const w = Math.min(full.width - 32, 760);
      const r = (at === "landed" && el?.getBoundingClientRect()) || { left: (full.width - w) / 2, top: full.height * 0.22, width: w, height: 0 };
      const p = plane(t), c = topDown(r, p, full.width, full.height, FLY_FOV);
      const pos = new Vector3(c.x, at === "above" ? c.y + (c.y - p.y) * 0.8 : c.y, c.z);
      // Landed, only the piece's own rect is drawn: around it the canvas shows the backdrop, the 2D page's own color.
      const clip = at === "landed" && el ? { left: r.left, top: r.top, width: r.width, height: full.height - r.top } : full;
      return { t, pos, quat: DOWN.clone(), fov: FLY_FOV, view: full, clip, slide: SLIDE };
    },
    /** Flies the camera from one shot to another; the last frame stays on the canvas until release(). */
    play(a: Shot, b: Shot, ms: number) {
      return new Promise<void>((done) => {
        fly = { a, b, t0: performance.now(), ms, done };
        invalidate();
      });
    },
    /** Ends a flight: clears the canvas and puts every piece back. */
    release() {
      fly = null;
      cancelAnimationFrame(raf);
      raf = 0;
      cabinet.visible = fichero.visible = true;
      drawers.forEach((d) => (d.g.position.z = D / 2 + d.z));
      renderer.setScissorTest(false);
      renderer.clear();
    },
    /** Binds the scene to the Sala page now in the DOM. Returns the undo. */
    attach(cab: HTMLElement, fbox: HTMLElement, ready: () => void) {
      const links = [...cab.querySelectorAll<HTMLAnchorElement>(".dfront")];
      views[0].el = cab;
      views[1].el = fbox;
      attached = true;
      onFirstFrame = ready;
      invalidate();
      const peek = (i: number) => { drawers.forEach((d, j) => (d.to = i === j ? PEEK : 0)); invalidate(); };
      const lift = (on: boolean) => { fcards.to = on ? 0.045 : 0; invalidate(); };

      const ac = new AbortController();
      const on = <K extends keyof HTMLElementEventMap>(t: EventTarget, k: K | string, f: (e: HTMLElementEventMap[K]) => void) =>
        t.addEventListener(k, f as EventListener, { signal: ac.signal, passive: true });
      on(cab, "pointermove", (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        const i = pick(e, cab);
        cab.style.cursor = i < 0 ? "" : "pointer";
        peek(i);
      });
      on(cab, "pointerleave", () => peek(-1));
      // Mouse or touch: a click on a drawer follows its DOM link, so a tap opens it straight away.
      on(cab, "click", (e: MouseEvent) => e.target === cab && links[pick(e, cab)]?.click());
      on(cab, "focusin", (e: FocusEvent) => peek(links.indexOf(e.target as HTMLAnchorElement)));
      on(cab, "focusout", () => peek(-1));
      on(fbox, "pointerenter", () => lift(true));
      on(fbox, "pointerleave", () => lift(false));
      on(fbox, "focus", () => lift(true));
      on(fbox, "blur", () => lift(false));
      on(window, "scroll", invalidate);
      on(window, "resize", invalidate);

      return () => {
        attached = false;
        onFirstFrame = null;
        ac.abort();
        cancelAnimationFrame(raf);
        raf = 0;
        cab.style.cursor = "";
        drawers.forEach((d) => (d.to = d.z = 0));
        fcards.to = fcards.z = 0;
        views.forEach((v) => (v.el = null));
        renderer.setScissorTest(false);
        renderer.clear();
      };
    },
  };
}

export type Sala = Awaited<ReturnType<typeof mountSala>>;
