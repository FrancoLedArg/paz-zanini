// PROTOTYPE (#67), never merged: the Hélice's entrance and exit, as one phase the 3D scene reads every frame.
// Ported from #58's intro.ts. No three or R3F import here: this module ships with the first-paint bundle.

/** rise: #58's pick, the whole helix rises from below and carries on up. slide: it moves sideways, like a page. */
export type IntroStyle = "rise" | "slide";

const state = {
  style: null as IntroStyle | null,
  phase: { x: 1, v: 0 },
  target: 1,
  /** +1 while entering, -1 while leaving. */
  sign: 1,
  /** slide only: +1 the books sit off to the right, -1 off to the left. */
  side: 1,
  done: null as null | (() => void),
  wake: null as null | (() => void),
  snap: false,
};

/** True once per entrance: the scene sets its focus straight to the step in view. */
export function takeSnap() {
  const snap = state.snap;
  state.snap = false;
  return snap;
}

const TUNING = {
  enter: { stiffness: 22, damping: 8.5 },
  exit: { stiffness: 38, damping: 12 },
};

export function setIntroStyle(style: IntroStyle | null) {
  state.style = style;
}

export function onIntroWake(wake: () => void) {
  state.wake = wake;
}

/** Every book off stage, ready for an entrance. */
export function hideBooks() {
  state.phase = { x: 0, v: 0 };
  state.target = 0;
  document.documentElement.dataset.intro = "out";
}

export function play(kind: "enter" | "exit", side = 1): Promise<void> {
  state.sign = kind === "enter" ? 1 : -1;
  state.side = side;
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
  /** 0 in place, 1 gone. */
  q: number;
  sign: number;
  side: number;
  moving: boolean;
}

export function stepIntro(dt: number): Intro | null {
  if (!state.style) return null;
  const p = state.phase;
  const tuning = state.sign > 0 ? TUNING.enter : TUNING.exit;
  p.v += (tuning.stiffness * (state.target - p.x) - tuning.damping * p.v) * dt;
  p.x += p.v * dt;
  const settled =
    state.sign < 0
      ? p.x < 0.12
      : Math.abs(state.target - p.x) < 1e-3 && Math.abs(p.v) < 1e-3;
  if (settled) {
    p.x = state.target;
    p.v = 0;
    const done = state.done;
    state.done = null;
    done?.();
  }
  return {
    style: state.style,
    q: 1 - p.x,
    sign: state.sign,
    side: state.side,
    moving: !settled,
  };
}
