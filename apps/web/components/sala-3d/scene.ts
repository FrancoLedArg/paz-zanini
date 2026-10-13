// The 3D Sala: renders the Archivador into a DOM element of the Sala page, scrolls the camera along it, and opens
// drawers and Carpetas under the pointer. This module wires the pieces together and runs the render loop.
//
// It renders on demand: a frame is drawn only when something changed (`invalidate`), and frames keep coming only
// while something is still moving. Nothing is drawn while the page is hidden or the Sala isn't showing.
import { Scene, Vector3 } from "three";
import { buildArchivador } from "./archivador";
import { createMaterials } from "./archivador/materials";
import { CABINET } from "./archivador/measures";
import { createCamera, placeCamera } from "./camera";
import { damped, FAST, SLOW, step, type Damped } from "./damped";
import { listenToPage } from "./input";
import { createEnvironment, createLamp } from "./lighting";
import { applyThemeColors, paintTextures, waitForSiteFonts } from "./paint";
import { createPicker } from "./picking";
import { createRenderer } from "./renderer";
import { createState } from "./state";
import { setTargets, type Aim } from "./targets";
import { SALA_EVENT, type CajonData, type SalaEventDetail } from "./types";
import { progress, viewport } from "./view";

/** The longest step a frame may take, in seconds, so a slow frame doesn't make things jump. */
const MAX_FRAME_TIME = 0.05;

/**
 * Creates the scene on `canvas`, with `cajonesData[i]` in drawer i. `go(href)` navigates to a Carpeta.
 * Resolves once the Rótulos are drawn with the site's fonts, so the first frame never shows them blank.
 * Call `attach` on the returned object each time the Sala page is shown.
 */
export async function mountSala(canvas: HTMLCanvasElement, cajonesData: CajonData[], go: (href: string) => void) {
  const renderer = createRenderer(canvas);
  const scene = new Scene();
  scene.environment = createEnvironment(renderer);
  const lamp = createLamp();
  scene.add(lamp, lamp.target);

  const materials = createMaterials();
  const archivador = buildArchivador(cajonesData, materials);
  const cajones = archivador.cajones;
  scene.add(archivador.group);

  const camera = createCamera();
  const lookAt = new Vector3(); // where the camera looks this frame, built from `aim`
  const pick = createPicker(camera, cajones);
  const state = createState();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const aim: Aim = { y: damped(FAST), z: damped(FAST), tilt: damped(SLOW) };
  // Everything that moves, so the loop can step them all and `detach` can reset them all.
  const moving: Damped[] = [
    aim.y,
    aim.z,
    aim.tilt,
    ...cajones.flatMap((cajon) => [cajon.slide, ...cajon.carpetas.flatMap((carpeta) => [carpeta.lift, carpeta.sheetLift])]),
  ];

  // ---- Render loop ----
  let raf = 0; // the pending animation frame, or 0
  let lastTime = 0; // when the last frame ran, or 0 if the loop was idle
  let attached = false;
  let onFirstFrame: (() => void) | null = null;

  /** Asks for a frame, unless one is already coming or there's nothing to show. */
  function invalidate() {
    if (!raf && attached && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function frame(time: number) {
    raf = 0;
    const dt = lastTime ? Math.min(MAX_FRAME_TIME, (time - lastTime) / 1000) : 0; // seconds; 0 after an idle spell
    lastTime = time;

    if (state.track) {
      setTargets(cajones, aim, state, progress(state.track.getBoundingClientRect(), window.innerHeight));
      if (state.snapCamera) {
        // Just attached: nothing to glide from, so the camera starts where it's going.
        aim.y.value = aim.y.target;
        aim.z.value = aim.z.target;
        state.snapCamera = false;
      }
    }
    let stillMoving = false;
    for (const d of moving) {
      if (step(d, dt, reducedMotion.matches)) stillMoving = true;
    }
    moveMeshes();
    render();

    onFirstFrame?.();
    onFirstFrame = null;
    if (stillMoving) invalidate();
    else lastTime = 0;
  }

  /** Moves the meshes to where their Damped values are. */
  function moveMeshes() {
    for (const cajon of cajones) {
      cajon.group.position.z = CABINET.depth / 2 + cajon.slide.value; // closed, its front is flush with the cabinet's
      for (const carpeta of cajon.carpetas) {
        carpeta.group.position.y = carpeta.baseY + carpeta.lift.value;
        carpeta.sheet.position.y = carpeta.sheetBaseY + carpeta.sheetLift.value;
      }
    }
  }

  function render() {
    // The canvas covers the window; keep its drawing buffer the size it's shown at.
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const ratio = renderer.getPixelRatio();
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      renderer.setSize(width, height, false);
    }

    // Clear everything, then draw only inside the slot, wherever it is on screen right now.
    renderer.setScissorTest(false);
    renderer.clear();
    const rect = state.slot ? viewport(state.slot.getBoundingClientRect(), width, height) : null;
    if (!rect) return; // detached, or scrolled out of view
    placeCamera(camera, lookAt.set(0, aim.y.value, aim.z.value), aim.tilt.value, rect.w, rect.h);
    renderer.setScissorTest(true);
    renderer.setViewport(rect.x, rect.y, rect.w, rect.h);
    renderer.setScissor(rect.x, rect.y, rect.w, rect.h);
    renderer.render(scene, camera);
  }

  // ---- Theme ----
  let paintCount = 0;

  function repaint() {
    applyThemeColors(materials, scene);
    const thisPaint = ++paintCount;
    paintTextures(cajones, cajonesData, (cover) => {
      if (thisPaint !== paintCount) return; // a cover from an earlier theme that finished late: a newer one is coming
      cover.texture.needsUpdate = true;
      invalidate();
    });
    invalidate();
  }

  await waitForSiteFonts();
  repaint();
  // These live as long as the page: the scene is never torn down (see sala-3d.tsx).
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", repaint);
  new MutationObserver(repaint).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  document.addEventListener("visibilitychange", invalidate);

  // ---- What the page can do ----
  /** Opens drawer `cajon` (-1: none) and lifts its Carpeta `carpeta`; tells the page, which shows their text (SalaInfo). */
  function show(cajon: number, carpeta: number) {
    if (cajon === state.open && carpeta === state.carpeta) return;
    state.open = cajon;
    state.carpeta = carpeta;
    window.dispatchEvent(new CustomEvent<SalaEventDetail>(SALA_EVENT, { detail: { cajon, carpeta } }));
    invalidate();
  }

  function setHover(cajon: number) {
    state.hover = cajon;
    invalidate();
  }

  return {
    /**
     * Draws the scene into `slot` (the Sala page's SalaSlot) and listens to the page. `onReady` runs after the first
     * frame. Returns `detach`, to call when the page goes away.
     */
    attach(slot: HTMLElement, onReady: () => void) {
      const track = slot.closest("main")!;
      state.slot = slot;
      state.track = track;
      state.snapCamera = true;
      attached = true;
      onFirstFrame = onReady;
      invalidate();

      const listeners = new AbortController();
      const actions = {
        pick: (e: MouseEvent) => pick(e, slot, state.open),
        show,
        setHover,
        follow: (carpeta: number) => go(cajonesData[state.open].carpetas[carpeta].href),
        invalidate,
      };
      listenToPage(slot, track, state, actions, { signal: listeners.signal, reducedMotion });

      return function detach() {
        attached = false;
        onFirstFrame = null;
        listeners.abort();
        cancelAnimationFrame(raf);
        raf = 0;
        slot.style.cursor = "";
        show(-1, -1);
        state.hover = -1;
        state.slot = null;
        state.track = null;
        for (const d of moving) {
          d.value = 0; // everything closed, for the next visit
          d.target = 0;
        }
        renderer.setScissorTest(false);
        renderer.clear();
      };
    },
  };
}

export type Sala = Awaited<ReturnType<typeof mountSala>>;
