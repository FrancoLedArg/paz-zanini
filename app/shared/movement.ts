// The Hélice's entrance and exit (#70, from #67's "Rótulo"): one offset the 3D scene reads every frame. No three or
// R3F import here, so the Colección filters can start a change from the first-paint bundle.
//
// A Colección change is one movement: the helix speeds up and away, and the next Colección follows from below at the
// same speed and settles. `o` is the offset in units of TRAVEL: 0 in place, +1 gone up, -1 waiting below. The exit eases
// in and the entrance eases out, timed so the speed matches across the swap, and the scene closes its fog as |o| nears 1,
// so the swap happens with every book already dissolved into the paper.
import type { ColeccionId } from "../catalog/catalog";
import { cambio } from "../change-prototype/switches";

/** World units the helix travels on each side of the swap. */
export const TRAVEL = 9;
/** Exit: ease-in of power 3. Entrance: ease-out of power 4. Equal speed at the swap needs EXIT_S / 3 = ENTER_S / 4. */
// PROTOTYPE (#84): each `cambio` has its own timing and curves; the scene reads `o` its own way for each.
const TIMING = {
  actual: {
    exit: 0.6,
    enter: 0.8,
    out: (u: number) => u ** 3,
    in: (u: number) => 1 - (1 - u) ** 4,
  },
  fundido: {
    exit: 0.35,
    enter: 0.6,
    out: (u: number) => u * u * (3 - 2 * u),
    in: (u: number) => 1 - (1 - u) ** 3,
  },
  // Linear: each book eases its own share of it.
  uno: { exit: 0.55, enter: 0.8, out: (u: number) => u, in: (u: number) => u },
  // One motion across the cut: fast as it leaves, settling as it arrives.
  paso: {
    exit: 0.3,
    enter: 0.6,
    out: (u: number) => 1 - (1 - u) ** 2,
    in: (u: number) => 1 - (1 - u) ** 3,
  },
  // Away, gathering speed; back, slowing to rest.
  fondo: {
    exit: 0.45,
    enter: 0.9,
    out: (u: number) => u * u,
    in: (u: number) => 1 - (1 - u) ** 4,
  },
}[cambio];
const EXIT_S = TIMING.exit;
const ENTER_S = TIMING.enter;
/** How far into the entrance the new book is settling. */
const SETTLING_AT = 0.55;
/** The longest the entrance waits, out of sight, for the next Colección's books to mount. */
const HOLD_S = 1;

type Step = "building" | "waiting" | "leaving" | "arriving" | "settling";

interface Anim {
  kind: "enter" | "exit";
  t: number;
  /** Where the exit started: a change picked mid-entrance leaves from where the books are. */
  from: number;
  held: number;
  done: () => void;
}

/** What the scene lends the movement while it is on screen. */
interface Scene {
  /** The Colección it holds. */
  coleccion: () => ColeccionId;
  /** Draws a Colección's first covers ahead, so they are ready by the swap. */
  prewarm: (coleccion: ColeccionId) => Promise<void>;
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
  /** Where the change under way is heading; null when there is none. */
  target: null as ColeccionId | null,
};

/** <html data-helice> names the step, for the e2e journeys to follow the movement (and #79's record to hide in it). */
function mark(step: Step | null) {
  if (document.documentElement.dataset.helice === (step ?? undefined)) return;
  if (step) document.documentElement.dataset.helice = step;
  else delete document.documentElement.dataset.helice;
}

const listeners = new Set<() => void>();

/** Sets where the change under way is heading, and tells whoever shows it (the Colección filters mark it). */
function aim(target: ColeccionId | null) {
  if (state.target === target) return;
  state.target = target;
  for (const listener of listeners) listener();
}

export function subscribeToChange(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
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

/** The scene, once shown, lends its hooks; the returned function takes them back. */
export function attachScene(scene: Scene) {
  state.scene = scene;
  return () => {
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

/** Whether the 3D Hélice is on screen, so a Colección change can play its exit and entrance. */
export const canMove = () => state.scene !== null;

/** Starts drawing a Colección's first covers, so a change picked now finds them ready by the swap. */
export function prewarm(coleccion: ColeccionId) {
  void state.scene?.prewarm(coleccion);
}

/** The Colección a change this module started is heading to, if one is under way. */
export const changingTo = () => state.target;

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
    state.o = a.from + (1 - a.from) * TIMING.out(u);
    if (u === 1) {
      // Gone, and dissolved: park the books below so whatever mounts next is out of sight too. Picking the Colección
      // already shown mounts no new books, so there is nothing to wait for.
      state.o = -1;
      state.waitBooks = state.target !== state.scene?.coleccion();
      state.anim = null;
      a.done();
    }
  } else if (a) {
    a.t += dt;
    const u = Math.min(a.t / ENTER_S, 1);
    state.o = -(1 - TIMING.in(u));
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
 * A Colección change: the exit, the new page (`go`), then the entrance, landing on the new Colección's first book.
 * Without the 3D Hélice on screen (reduced motion, no WebGL, another page) it is just the new page. A change picked
 * mid-movement takes over from wherever the books are; one the scene leaves (a Manual opened, Back) is dropped.
 */
export async function changeColeccion(
  coleccion: ColeccionId,
  go: () => void | Promise<void>,
) {
  const id = ++state.change;
  if (!state.scene) {
    await go();
    return;
  }
  aim(coleccion);
  // PROTOTYPE (#84): build first, move after. Every new cover is drawn and uploaded while the books stand still, so the
  // movement has no work inside it. The filters already mark the new Colección meanwhile.
  mark("building");
  await state.scene.prewarm(coleccion);
  if (id !== state.change) return;
  // Books still dissolved (mid-swap) need no exit.
  if (fogClosed(state.o) < 1) await play("exit");
  if (id !== state.change) return;
  await go();
  scrollTo({ top: 0, behavior: "instant" });
  await frame();
  await frame();
  if (id !== state.change) return;
  await play("enter");
  if (id === state.change) aim(null);
}
