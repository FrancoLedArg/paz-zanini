// What the Colección filters need of a change, in the first-paint bundle: where it is heading, and the 3D Hélice to
// play it. The movement itself (app/book/movement.ts) loads with the 3D chunk and lends itself here once on screen.
import type { ColeccionId } from "../catalog/catalog";

/** What the 3D Hélice lends the filters while it is on screen. */
interface Scene {
  /** Draws a Colección's first covers ahead, so they are ready by the swap. */
  prewarm: (coleccion: ColeccionId) => Promise<void>;
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
  coleccion: ColeccionId,
  go: () => void | Promise<void>,
) {
  if (scene) await scene.change(coleccion, go);
  else await go();
}
