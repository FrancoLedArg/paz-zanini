<<<<<<<< Updated upstream:app/book/movement.ts
// The Hélice's entrance and exit (#70, from #67's "Rótulo"): one offset the 3D scene reads every frame. It loads with the
// 3D chunk and lends itself to the filters (app/shared/movement.ts) while the scene is on screen (#83).
//
// A Colección change is one movement: the helix speeds up and away, and the next Colección follows from below at the
// same speed and settles. `o` is the offset in units of TRAVEL: 0 in place, +1 gone up, -1 waiting below. The exit eases
// in and the entrance eases out, timed so the speed matches across the swap, and the scene closes its fog as |o| nears 1,
// so the swap happens with every book already dissolved into the paper.
========
// What the Colección filters need of a change, in the first-paint bundle: where it is heading, and the 3D Hélice to
// play it. The movement itself (app/book/movement.ts) loads with the 3D chunk and lends itself here once on screen.
>>>>>>>> Stashed changes:app/shared/movement.ts
import type { ColeccionId } from "../catalog/catalog";
import { aim, changingTo, lendScene } from "../shared/movement";

/** What the 3D Hélice lends the filters while it is on screen. */
interface Scene {
  /** Draws a Colección's first covers ahead, so they are ready by the swap. */
  prewarm: (coleccion: ColeccionId) => Promise<void>;
<<<<<<<< Updated upstream:app/book/movement.ts
  /** Asks for a frame. */
  wake: () => void;
}

const state = {
  o: 0,
  anim: null as Anim | null,
  scene: null as Scene | null,
  /** From the exit's end until the next Colección's books mount: the entrance waits, out of sight, for them. */
  waitBooks: false,
  /** Set as an entrance starts: the scene's focus jumps to the step in view instead of turning to it. */
  snap: false,
  /** The latest change: an earlier one that finds it has moved on stops. */
  change: 0,
};

/** <html data-helice> names the step, for the e2e journeys to follow the movement (and #79's record to hide in it). */
function mark(step: Step | null) {
  if (document.documentElement.dataset.helice === (step ?? undefined)) return;
  if (step) document.documentElement.dataset.helice = step;
  else delete document.documentElement.dataset.helice;
}

/** Ends the exit or entrance under way, resolving whoever waits on it. */
function stop() {
  state.anim?.done();
  state.anim = null;
}

/** Stops whatever is moving or pending, and leaves the books in place and nothing hidden. */
export function reset() {
  state.change++;
  aim(null);
  stop();
  state.o = 0;
  state.waitBooks = false;
  mark(null);
}

/** The scene, once shown, lends its hooks, and the filters get the movement; the returned function takes them back. */
export function attachScene(scene: Scene) {
  state.scene = scene;
  const unlend = lendScene({ prewarm: scene.prewarm, change: changeColeccion });
  return () => {
    unlend();
    state.scene = null;
    reset();
  };
}

/** Every book waiting below, dissolved, ready for an entrance. */
export function park() {
  stop();
  state.o = -1;
  mark("waiting");
}

/** The scene calls this as each book mounts. */
export function booksMounted() {
  state.waitBooks = false;
}

/** True once per entrance. */
export function takeSnap() {
  const snap = state.snap;
  state.snap = false;
  return snap;
}

/** An entrance the scene plays on its own (a first visit, Back, Forward): it drops any change under way. */
export function arrive() {
  state.change++;
  aim(null);
  return play("enter");
}

/** Plays the exit or the entrance; resolves once it ends, is replaced, or the scene goes. */
function play(kind: "enter" | "exit"): Promise<void> {
  stop();
  // Nothing on screen to move: nothing to wait for.
  if (!state.scene) return Promise.resolve();
  if (kind === "enter") {
    state.o = -1;
    state.snap = true;
  }
  mark(kind === "enter" ? "arriving" : "leaving");
  state.scene.wake();
  return new Promise((resolve) => {
    state.anim = { kind, t: 0, from: state.o, held: 0, done: resolve };
  });
}

/** Advances the movement by `dt` seconds; the offset to draw, and whether it is still moving. */
export function stepMovement(dt: number) {
  const a = state.anim;
  // The entrance holds, out of sight, while the new books mount, in case one never does.
  const held = a?.kind === "enter" && state.waitBooks && a.held < HOLD_S;
  if (a && held) a.held += dt;
  else if (a?.kind === "exit") {
    a.t += dt;
    const u = Math.min(a.t / EXIT_S, 1);
    state.o = a.from + (1 - a.from) * u ** 3;
    if (u === 1) {
      // Gone, and dissolved: park the books below so whatever mounts next is out of sight too. Picking the Colección
      // already shown mounts no new books, so there is nothing to wait for.
      state.o = -1;
      state.waitBooks = changingTo() !== state.scene?.coleccion();
      state.anim = null;
      a.done();
    }
  } else if (a) {
    a.t += dt;
    const u = Math.min(a.t / ENTER_S, 1);
    state.o = -((1 - u) ** 4);
    if (u >= SETTLING_AT) mark("settling");
    if (u === 1) {
      state.anim = null;
      mark(null);
      a.done();
    }
  }
  return { o: state.o, moving: state.anim !== null };
}

/** How far the fog has closed in: 0 normal, 1 (from |o| = 0.95) every book the colour of the paper. */
export function fogClosed(o: number) {
  const x = Math.min(Math.max((Math.abs(o) - 0.55) / 0.4, 0), 1);
  return x * x * (3 - 2 * x);
}

export const frame = () =>
  new Promise((resolve) => {
    requestAnimationFrame(resolve);
  });

/**
 * A Colección change, lent to the filters: the exit, the new page (`go`), then the entrance, landing on the new
 * Colección's first book. A change picked mid-movement takes over from wherever the books are; one the scene leaves (a
 * Manual opened, Back) is dropped.
 */
async function changeColeccion(
========
  /** Plays a change: the exit, the new page (`go`), then the entrance. */
  change: (
    coleccion: ColeccionId,
    go: () => void | Promise<void>,
  ) => Promise<void>;
}

let scene: Scene | null = null;
/** Where the change under way is heading; null when there is none. */
let target: ColeccionId | null = null;
const listeners = new Set<() => void>();

/** Sets where the change under way is heading, and tells whoever shows it (the Colección filters mark it). */
export function aim(next: ColeccionId | null) {
  if (target === next) return;
  target = next;
  for (const listener of listeners) listener();
}

export function subscribeToChange(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The Colección a change is heading to, if one is under way. */
export const changingTo = () => target;

/** The 3D Hélice, once on screen, lends its movement; the returned function takes it back. */
export function lendScene(lent: Scene) {
  scene = lent;
  return () => {
    scene = null;
  };
}

/** Whether the 3D Hélice is on screen, so a Colección change can play its exit and entrance. */
export const canMove = () => scene !== null;

/** Starts drawing a Colección's first covers, so a change picked now finds them ready by the swap. */
export function prewarm(coleccion: ColeccionId) {
  void scene?.prewarm(coleccion);
}

/** A Colección change: played by the 3D Hélice when it is on screen; otherwise (reduced motion, no WebGL) just `go`. */
export async function changeColeccion(
>>>>>>>> Stashed changes:app/shared/movement.ts
  coleccion: ColeccionId,
  go: () => void | Promise<void>,
) {
  if (scene) await scene.change(coleccion, go);
  else await go();
}
