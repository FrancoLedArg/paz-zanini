// PROTOTYPE (#58), never merged: the Hélice's entrance and exit, as one phase the 3D scene reads every frame.
// No three or R3F import here: this module ships with the menu in the first-paint bundle.

export type IntroStyle = "wind" | "fog" | "spin";

interface Phase {
  /** 1: every book in place; 0: every book gone. */
  x: number;
  v: number;
}

const state = {
  style: null as IntroStyle | null,
  phase: { x: 1, v: 0 } satisfies Phase,
  target: 1,
  /** +1 while entering, -1 while leaving: the direction the books travel. */
  sign: 1,
  done: null as null | (() => void),
  wake: null as null | (() => void),
  /** An entrance starts on the new focus at once: the helix doesn't also turn across the jump. */
  snap: false,
};

/** The chosen Colección's books, by index: the 3D Hélice shows only these, as #61's filter will. Null: every book. */
let range: [number, number] | null = null;
export function setRange(next: [number, number] | null) {
  range = next;
}
export function inRange(index: number) {
  return !range || (index >= range[0] && index <= range[1]);
}

/** True once per entrance: the scene sets its focus straight to the step in view. */
export function takeSnap() {
  const snap = state.snap;
  state.snap = false;
  return snap;
}

/** Entrance: soft and a touch slow, with a little settle. Exit: quicker, nearly critically damped. */
const TUNING = {
  enter: { stiffness: 22, damping: 8.5 },
  exit: { stiffness: 38, damping: 12 },
};

export function setIntroStyle(style: IntroStyle | null) {
  state.style = style;
}

/** The scene registers its invalidate, so a frame runs when an entrance or exit starts. */
export function onIntroWake(wake: () => void) {
  state.wake = wake;
}

/** Every book off stage, ready for an entrance. */
export function hideBooks() {
  state.phase = { x: 0, v: 0 };
  state.target = 0;
  document.documentElement.dataset.intro = "out";
}

export function play(kind: "enter" | "exit"): Promise<void> {
  state.sign = kind === "enter" ? 1 : -1;
  if (kind === "enter") {
    state.phase = { x: 0, v: 0 };
    state.snap = true;
  }
  state.target = kind === "enter" ? 1 : 0;
  document.documentElement.dataset.intro = "out";
  state.wake?.();
  return new Promise((resolve) => {
    state.done = () => {
      if (kind === "enter") delete document.documentElement.dataset.intro;
      resolve();
    };
  });
}

export interface Intro {
  style: IntroStyle;
  /** 0 in place, 1 gone (it overshoots a little past 0 as the entrance settles). */
  q: number;
  sign: number;
  moving: boolean;
}

/** Advances the phase by `dt` seconds; null when no prototype style is set. */
export function stepIntro(dt: number): Intro | null {
  if (!state.style) return null;
  const p = state.phase;
  const tuning = state.sign > 0 ? TUNING.enter : TUNING.exit;
  p.v += (tuning.stiffness * (state.target - p.x) - tuning.damping * p.v) * dt;
  p.x += p.v * dt;
  // An exit ends once the books are out of sight; it needn't wait for the spring to rest.
  const settled =
    state.sign < 0
      ? p.x < 0.02
      : Math.abs(state.target - p.x) < 1e-3 && Math.abs(p.v) < 1e-3;
  if (settled) {
    p.x = state.target;
    p.v = 0;
    const done = state.done;
    state.done = null;
    done?.();
  }
  return { style: state.style, q: 1 - p.x, sign: state.sign, moving: !settled };
}
