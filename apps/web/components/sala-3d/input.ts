// What the Sala page's pointer, keyboard and scroll events do to the scene.
import type { Picked } from "./picking";
import type { SalaState } from "./state";

/** What an event can ask the scene to do. */
export interface SalaActions {
  pick(e: MouseEvent): Picked;
  /** Opens drawer `cajon` and lifts its Carpeta `carpeta` (-1: none). */
  show(cajon: number, carpeta: number): void;
  setHover(cajon: number): void;
  /** Navigates to the open drawer's Carpeta `carpeta`. */
  follow(carpeta: number): void;
  invalidate(): void;
}

/** How far the page can scroll with a drawer open before it closes, in px. */
const CLOSE_AFTER_SCROLL = 120;

/**
 * Listens to the page until `signal` aborts. Keyboard users get the DOM drawers instead, which link to the 2D Cajón.
 * `reducedMotion` is the scene's media query, so focus scrolls the page smoothly only when the user wants motion.
 */
export function listenToPage(
  slot: HTMLElement,
  track: HTMLElement,
  state: Readonly<SalaState>,
  actions: SalaActions,
  { signal, reducedMotion }: { signal: AbortSignal; reducedMotion: MediaQueryList },
) {
  const options = { signal, passive: true };
  const domDrawers = [...slot.querySelectorAll<HTMLAnchorElement>(".drawer-front")];
  let usingTouch = false; // was the last pointer a finger or a pen?
  let scrollYWhenOpened = 0;

  slot.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const { cajon, carpeta } = actions.pick(e);
    slot.style.cursor = cajon < 0 ? "" : "pointer";
    actions.setHover(cajon);
    actions.show(state.open, carpeta);
  }, options);

  slot.addEventListener("pointerleave", () => {
    actions.setHover(-1);
    actions.show(state.open, -1);
  }, options);

  slot.addEventListener("pointerdown", (e) => {
    usingTouch = e.pointerType !== "mouse";
  }, options);

  // A click on a drawer opens it (or closes it, if open) right there; on a Carpeta, follows it.
  slot.addEventListener("click", (e) => {
    if (e.target !== slot) return; // a click on a DOM link: let it navigate
    const { cajon, carpeta } = actions.pick(e);
    if (carpeta >= 0) {
      // On touch there's no hover, so the first tap on a Carpeta only lifts it and shows its Ficha; the second opens it.
      if (usingTouch && carpeta !== state.carpeta) actions.show(state.open, carpeta);
      else actions.follow(carpeta);
      return;
    }
    scrollYWhenOpened = window.scrollY;
    actions.show(cajon === state.open ? -1 : cajon, -1);
  }, options);

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") actions.show(-1, -1);
  }, options);

  window.addEventListener("scroll", () => {
    if (state.open >= 0 && Math.abs(window.scrollY - scrollYWhenOpened) > CLOSE_AFTER_SCROLL) actions.show(-1, -1);
    actions.invalidate();
  }, options);

  // A focused DOM drawer peeks out, and the page scrolls the camera to it.
  slot.addEventListener("focusin", (e) => {
    const i = domDrawers.indexOf(e.target as HTMLAnchorElement);
    actions.setHover(i);
    if (i < 0) return;
    const r = track.getBoundingClientRect();
    const share = i / (domDrawers.length - 1); // 0 for the top drawer, 1 for the bottom one
    const top = window.scrollY + r.top + share * (r.height - window.innerHeight);
    window.scrollTo({ top, behavior: reducedMotion.matches ? "auto" : "smooth" });
  }, options);

  slot.addEventListener("focusout", () => actions.setHover(-1), options);
  window.addEventListener("resize", actions.invalidate, options);
}
