import { MathUtils } from "three";

/**
 * A number that glides toward `target`, covering a share of the remaining distance every frame, so it slows down as
 * it arrives (exponential damping). `rate` is how fast: the higher, the snappier.
 * The scene moves every drawer, every Carpeta and the camera with one of these.
 */
export type Damped = { value: number; target: number; rate: number };

/** Snappy: the Carpetas following the pointer, the camera following the scroll. */
export const FAST = 14;
/** Unhurried: drawers sliding, the camera leaning over an open drawer. */
export const SLOW = 4.5;

export const damped = (rate: number): Damped => ({ value: 0, target: 0, rate });

/**
 * Moves `d` toward its target for one frame that lasted `dt` seconds. MathUtils.damp takes `dt` into account, so the
 * motion looks the same at 30 or 120 fps. With reduced motion, it jumps straight there.
 * Returns true while it still has a way to go.
 */
export function step(d: Damped, dt: number, reducedMotion: boolean) {
  d.value = reducedMotion ? d.target : MathUtils.damp(d.value, d.target, d.rate, dt);
  if (Math.abs(d.target - d.value) > 1e-4) return true;
  d.value = d.target; // close enough: land exactly, so the render loop can stop
  return false;
}
