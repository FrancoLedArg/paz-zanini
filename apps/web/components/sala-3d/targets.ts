// Where everything in the Sala should be heading, given the scroll and what's open. This only sets targets:
// the render loop (scene.ts) then moves every Damped value toward its target, a little each frame.
// Imports end in .ts because the test runs this file in Node directly, without a bundler.
import { CABINET, CARPETA, DRAWER } from "./archivador/measures.ts";
import { FAST, SLOW, type Damped } from "./damped.ts";
import type { SalaState } from "./state";

/** With no drawer open, the camera looks this far below the scroll position (m). */
const LOOK_BELOW = 0.08;
/** Over an open drawer, the camera looks this share of the way out, into its tray. */
const LOOK_INTO_TRAY = 0.6;

/** What this needs of a drawer (a CajonMesh has it): plain data, so the test doesn't have to build meshes. */
export interface DrawerMotion {
  /** The drawer's center height. */
  y: number;
  slide: Damped;
  carpetas: { lift: Damped; sheetLift: Damped }[];
}

/** Where the camera looks (height `y`, depth `z`), and how far it leans over an open drawer (`tilt`, 0 → 1). */
export interface Aim {
  y: Damped;
  z: Damped;
  tilt: Damped;
}

/**
 * Sets every target. `scrolled` is how far the page has scrolled through the Sala: 0 at the top drawer, 1 at the bottom.
 * The camera walks down the drawers with the scroll, and the drawers it passes stand ajar.
 */
export function setTargets(drawers: DrawerMotion[], aim: Aim, state: Pick<SalaState, "open" | "hover" | "carpeta">, scrolled: number) {
  const top = drawers[0].y;
  const bottom = drawers[drawers.length - 1].y;
  const cameraY = top + (bottom - top) * scrolled;

  drawers.forEach((drawer, i) => {
    const nearCamera = Math.max(0, 1 - Math.abs(drawer.y - cameraY) / (DRAWER.height + DRAWER.gap)); // 1 in front of it, 0 a drawer away
    if (i === state.open) drawer.slide.target = DRAWER.slide.open;
    else drawer.slide.target = Math.max(DRAWER.slide.ajar * nearCamera, i === state.hover ? DRAWER.slide.peek : 0);

    drawer.carpetas.forEach((carpeta, j) => {
      const lifted = i === state.open && j === state.carpeta;
      carpeta.lift.target = lifted ? CARPETA.lift : 0;
      carpeta.sheetLift.target = lifted ? CARPETA.sheetLift : 0;
    });
  });

  // The camera looks into the open drawer's tray or, with none open, just below the scroll position.
  const open: DrawerMotion | undefined = drawers[state.open];
  aim.y.target = open ? open.y : cameraY - LOOK_BELOW;
  aim.z.target = CABINET.depth / 2 + (open ? DRAWER.slide.open * LOOK_INTO_TRAY : 0);
  aim.tilt.target = open ? 1 : 0;

  // Leaning over a drawer, or back from one, is unhurried; following the scroll is snappy.
  const leaning = open !== undefined || aim.tilt.value > 1e-3;
  aim.y.rate = aim.z.rate = leaning ? SLOW : FAST;
}
