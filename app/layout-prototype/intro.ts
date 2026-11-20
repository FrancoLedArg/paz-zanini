// PROTOTYPE (#67), never merged: the Hélice's entrance and exit, as one offset the 3D scene reads every frame.
// No three or R3F import here: this module ships with the first-paint bundle.
//
// A Colección change is one movement: the helix speeds up and away, and the next Colección follows from below at the
// same speed and settles. `o` is the offset in units of TRAVEL: 0 in place, +1 gone up (exit), -1 waiting below
// (entrance). The exit eases in and the entrance eases out, timed so the speed matches across the swap, and the scene
// closes its fog near |o| = 1, so the swap happens with every book already dissolved into the paper.

/** rise: #58's pick, the whole helix rises from below and carries on up. slide: it moves sideways, like a page. */
export type IntroStyle = "rise" | "slide";

/** World units the helix travels on each side of the swap. */
export const TRAVEL = 9;
/** Exit: ease-in of power 3. Entrance: ease-out of power 4. Equal speed at the swap needs EXIT_S / 3 = ENTER_S / 4. */
const EXIT_S = 0.6;
const ENTER_S = 0.8;
/** The words come back this far into the entrance, so they arrive as the book settles. */
const WORDS_AT = 0.55;

interface Anim {
  kind: "enter" | "exit";
  t: number;
  held: number;
  done: () => void;
}

const state = {
  style: null as IntroStyle | null,
  o: 0,
  /** slide only: the side the books move towards (exit) or come from (entrance). */
  side: 1,
  anim: null as Anim | null,
  wake: null as null | (() => void),
  prewarm: null as null | ((coleccion: string) => void),
  /** Set from the exit's end until the next Colección's books mount: the entrance waits, out of sight, for them. */
  waitBooks: false,
  snap: false,
};

/** The scene draws a Colección's first covers ahead, so they're ready by the swap. */
export function onPrewarm(prewarm: (coleccion: string) => void) {
  state.prewarm = prewarm;
}

export function prewarmColeccion(coleccion: string) {
  state.prewarm?.(coleccion);
}

/** The scene calls this as each book mounts. */
export function booksMounted() {
  state.waitBooks = false;
}

/** True once per entrance: the scene sets its focus straight to the step in view. */
export function takeSnap() {
  const snap = state.snap;
  state.snap = false;
  return snap;
}

export function setIntroStyle(style: IntroStyle | null) {
  state.style = style;
}

export function onIntroWake(wake: () => void) {
  state.wake = wake;
}

/** Every book waiting below, ready for an entrance. */
export function hideBooks() {
  state.anim = null;
  state.o = -1;
  document.documentElement.dataset.intro = "out";
}

export function play(kind: "enter" | "exit", side = 1): Promise<void> {
  state.side = side;
  if (kind === "enter") {
    state.o = -1;
    state.snap = true;
  }
  document.documentElement.dataset.intro = "out";
  state.wake?.();
  return new Promise((resolve) => {
    state.anim?.done();
    state.anim = { kind, t: 0, held: 0, done: resolve };
  });
}

export interface Intro {
  style: IntroStyle;
  /** -1 waiting below, 0 in place, +1 gone up. */
  o: number;
  side: number;
  moving: boolean;
}

export function stepIntro(dt: number): Intro | null {
  if (!state.style) return null;
  const a = state.anim;
  // The entrance holds, out of sight, while the new books mount: 1 s at most, in case one never does.
  const held = a?.kind === "enter" && state.waitBooks && a.held < 1;
  if (a && held) a.held += dt;
  if (a && !held) {
    a.t += dt;
    if (a.kind === "exit") {
      const u = Math.min(a.t / EXIT_S, 1);
      state.o = u ** 3;
      if (u === 1) {
        // Gone, and dissolved: park the books below so whatever mounts next is out of sight too.
        state.o = -1;
        state.waitBooks = true;
        state.anim = null;
        a.done();
      }
    } else {
      const u = Math.min(a.t / ENTER_S, 1);
      state.o = -((1 - u) ** 4);
      if (u >= WORDS_AT) delete document.documentElement.dataset.intro;
      if (u === 1) {
        state.anim = null;
        a.done();
      }
    }
  }
  return {
    style: state.style,
    o: state.o,
    side: state.side,
    moving: state.anim !== null,
  };
}

/** How far the fog has closed in: 0 normal, 1 every book the colour of the paper. */
export function fogClosed(o: number) {
  const x = Math.min(Math.max((Math.abs(o) - 0.55) / 0.4, 0), 1);
  return x * x * (3 - 2 * x);
}
