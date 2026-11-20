// PROTOTYPE (#77): which book the Hélice has come to rest on, and `giro=peso`, a flick that moves exactly one book.
import { useSyncExternalStore } from "react";

import { reducedMotion } from "../shared/motion";
import { stepInView } from "../shared/track";

const track = () =>
  document.querySelector<HTMLElement>('ol[aria-label="Manuales"]');

// ---- The book at rest ----

interface Rest {
  /** The last step the scroll came to rest on. */
  step: number;
  /** False from the first scroll until it rests again on a step. */
  settled: boolean;
}

let rest: Rest = { step: 0, settled: false };
const listeners = new Set<() => void>();
let timer = 0;

function set(next: Rest) {
  if (next.step === rest.step && next.settled === rest.settled) return;
  rest = next;
  for (const listener of listeners) listener();
}

/** The scroll stopped: settled if a step is centred (a soft snap can leave it between two). */
function check() {
  const t = track();
  if (!t) return;
  const at = stepInView(t);
  const step = Math.round(at);
  set({ step, settled: Math.abs(at - step) < 0.04 });
}

function onScroll() {
  if (rest.settled) set({ ...rest, settled: false });
  clearTimeout(timer);
  // Long enough for a snap to finish; the 3D focus spring is still arriving, so the marks wait a little more (CSS).
  timer = window.setTimeout(check, 140);
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    addEventListener("scroll", onScroll, { passive: true });
    timer = window.setTimeout(check, 300);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) removeEventListener("scroll", onScroll);
  };
}

const SERVER: Rest = { step: 0, settled: false };

export function useRest(): Rest {
  return useSyncExternalStore(
    subscribe,
    () => rest,
    () => SERVER,
  );
}

// ---- giro=peso: one flick, one book ----

/** The scroll position that centres step i. */
function topOf(t: HTMLElement, i: number) {
  const step = t.children[i] as HTMLElement | undefined;
  if (!step) return scrollY;
  const box = step.getBoundingClientRect();
  return scrollY + box.top + box.height / 2 - innerHeight / 2;
}

/** A spring with a little give: overshoots about 4% and settles (stiffness 120, damping ratio ~0.72). */
const STIFFNESS = 120;
const DAMPING = 15.8;

/** Starts the controller; returns its stop. Wheel, touch and keys move one step per gesture, on a spring. */
export function startFlick() {
  let target: number | null = null;
  let pos = scrollY;
  let vel = 0;
  let frame = 0;
  let last = 0;
  let lastWheel = 0;
  let lastMag = 0;
  let movedAt = 0;

  const run = (now: number) => {
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    const t = track();
    if (target === null || !t) return;
    const goal = topOf(t, target);
    vel += (STIFFNESS * (goal - pos) - DAMPING * vel) * dt;
    pos += vel * dt;
    scrollTo(0, pos);
    if (Math.abs(goal - pos) < 0.5 && Math.abs(vel) < 5) {
      scrollTo(0, goal);
      frame = 0;
      return;
    }
    frame = requestAnimationFrame(run);
  };

  const animate = (initialVelocity?: number) => {
    if (initialVelocity !== undefined) vel = initialVelocity;
    if (!frame) {
      pos = scrollY;
      last = performance.now();
      frame = requestAnimationFrame(run);
    }
  };

  /** Moves from the book in focus (or the one already heading to) by one. */
  const go = (direction: number, from?: number) => {
    const t = track();
    if (!t || direction === 0) return;
    const base = from ?? target ?? Math.round(stepInView(t));
    target = Math.min(Math.max(base + direction, 0), t.children.length - 1);
    movedAt = performance.now();
    if (reducedMotion()) {
      scrollTo(0, topOf(t, target));
      return;
    }
    animate();
  };

  const onWheel = (event: WheelEvent) => {
    if (!track() || event.ctrlKey) return;
    event.preventDefault();
    const mag = Math.abs(event.deltaY);
    const now = performance.now();
    const gap = now - lastWheel;
    lastWheel = now;
    // A trackpad's inertia sends a long tail of shrinking deltas: only a pause or a rising delta starts a new flick.
    const fresh = gap > 160 || mag > lastMag * 1.5 + 4;
    lastMag = mag;
    if (mag < 1 || !fresh || now - movedAt < 120) return;
    if (!frame) target = null;
    go(Math.sign(event.deltaY));
  };

  let touch: {
    y: number;
    top: number;
    from: number;
    vy: number;
    t: number;
  } | null = null;
  const onTouchStart = (event: TouchEvent) => {
    const t = track();
    const finger = event.touches[0];
    if (!t || !finger || event.touches.length > 1) return;
    cancelAnimationFrame(frame);
    frame = 0;
    touch = {
      y: finger.clientY,
      top: scrollY,
      from: target ?? Math.round(stepInView(t)),
      vy: 0,
      t: performance.now(),
    };
    target = null;
  };
  const onTouchMove = (event: TouchEvent) => {
    const finger = event.touches[0];
    if (!touch || !finger) return;
    event.preventDefault();
    const now = performance.now();
    const top = touch.top - (finger.clientY - touch.y);
    // Scroll speed in px/s (positive going down the track), smoothed.
    const v = ((top - scrollY) / Math.max(now - touch.t, 1)) * 1000;
    touch.vy = touch.vy * 0.6 + v * 0.4;
    touch.t = now;
    scrollTo(0, top);
  };
  const onTouchEnd = () => {
    if (!touch) return;
    const moved = scrollY - touch.top;
    const flung = Math.abs(touch.vy) > 300;
    const direction =
      Math.abs(moved) > innerHeight * 0.12 || flung
        ? Math.sign(flung ? touch.vy : moved)
        : 0;
    const { from, vy } = touch;
    touch = null;
    target = from;
    // The finger's speed carries into the spring, so the book has weight.
    animate(vy);
    go(direction, from);
  };

  const onKey = (event: KeyboardEvent) => {
    if ((event.target as HTMLElement).closest("input, textarea, dialog"))
      return;
    const down = ["ArrowDown", "PageDown", " "].includes(event.key);
    const up = ["ArrowUp", "PageUp"].includes(event.key);
    if (!track() || (!down && !up)) return;
    event.preventDefault();
    go(down ? 1 : -1);
  };

  addEventListener("wheel", onWheel, { passive: false });
  addEventListener("touchstart", onTouchStart, { passive: true });
  addEventListener("touchmove", onTouchMove, { passive: false });
  addEventListener("touchend", onTouchEnd);
  addEventListener("touchcancel", onTouchEnd);
  addEventListener("keydown", onKey);
  return () => {
    cancelAnimationFrame(frame);
    removeEventListener("wheel", onWheel);
    removeEventListener("touchstart", onTouchStart);
    removeEventListener("touchmove", onTouchMove);
    removeEventListener("touchend", onTouchEnd);
    removeEventListener("touchcancel", onTouchEnd);
    removeEventListener("keydown", onKey);
  };
}
