"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type { Label, Sala, Target } from "./scene";

type Props = { cajones: (Label & { href: string })[]; fichero: Label };

const DIVE = 900, LAND = 550, FADE = 400;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const CAB = ".s-room .cab-wrap", FBOX = ".s-room .fbox";
/** Per piece: its slot in the Sala, the element the 2D page lands on, and the html[data-sala] / [data-backdrop] of its flights. */
const piece = (t: Target) =>
  t === "fichero"
    ? { slot: FBOX, landing: ".fbox-open", sala: "fichero", backdrop: "wall" }
    : { slot: CAB, landing: ".tray", sala: "cajon", backdrop: "tray" };

/** The element once `path` has rendered it, or null after 3 s. */
// ponytail: a page slower than 3 s lands on the estimated framing instead; raise the timeout if real networks need it.
const rendered = (path: string, sel: string) =>
  new Promise<Element | null>((done) => {
    const t0 = performance.now();
    const look = () => {
      const el = location.pathname === path ? document.querySelector(sel) : null;
      if (el || performance.now() - t0 > 3000) done(el);
      else requestAnimationFrame(look);
    };
    look();
  });

/**
 * The 3D Sala. Lives in the root layout so the WebGL context survives navigation. On "/" it draws into the DOM slots;
 * between the Sala and a Cajón or the Fichero it flies the camera over the whole page and fades into the 2D view.
 * html[data-sala] says what the canvas shows ("3d": the Sala; "cajon" | "fichero": a flight), html[data-backdrop] its background.
 */
export function Sala3D({ cajones, fichero }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const st = useRef<{ sala?: Promise<Sala | null>; unbind?: () => void; busy?: boolean }>({}).current;

  // Without WebGL the 2D Sala simply stays.
  const load = () => (st.sala ??= import("./scene").then((m) => m.mountSala(ref.current!, cajones, fichero)).catch(() => null));

  /** Draws the Sala now in the DOM, if there is one. */
  const bind = () => {
    const cab = document.querySelector<HTMLElement>(CAB), fbox = document.querySelector<HTMLElement>(FBOX);
    if (!cab || !fbox) return;
    let gone = false, detach: (() => void) | undefined;
    load().then((s) => { if (s && !gone) detach = s.attach(cab, fbox, () => (document.documentElement.dataset.sala = "3d")); });
    st.unbind = () => { gone = true; detach?.(); st.unbind = undefined; delete document.documentElement.dataset.sala; };
  };

  useEffect(() => {
    const html = document.documentElement;
    const targetOf = (path: string): Target | null => {
      const i = cajones.findIndex((c) => c.href === path);
      return path === "/fichero" ? "fichero" : i >= 0 ? i : null;
    };

    /** Flies down into the piece, from where it is on screen to where the 2D page puts it, then fades to the page. */
    const into = async (s: Sala, t: Target, start: ReturnType<Sala["shot"]>, landing: () => Promise<Element | null>) => {
      html.dataset.backdrop = piece(t).backdrop;
      const above = s.shot(t, "above");
      await s.play(start, above, DIVE);
      await s.play(above, s.shot(t, "landed", await landing()), LAND);
      delete html.dataset.sala;
      await wait(FADE);
      delete html.dataset.backdrop;
      s.release();
    };

    const enter = async (t: Target, href: string) => {
      const s = await load();
      if (!s) return router.push(href);
      st.busy = true;
      // Fetched while the camera dives; the page itself only replaces the Sala once the backdrop covers it.
      router.prefetch(href);
      const start = s.shot(t, "slot", document.querySelector(piece(t).slot));
      st.unbind?.();
      html.dataset.sala = piece(t).sala;
      await into(s, t, start, () => (router.push(href), rendered(href, piece(t).landing)));
      st.busy = false;
    };

    /** The way back: the landed frame fades in over the page, then the camera climbs out to the piece's slot in the Sala. */
    const leave = async (t: Target) => {
      const s = await load();
      if (!s) return router.push("/");
      st.busy = true;
      const landed = s.shot(t, "landed", document.querySelector(piece(t).landing));
      void s.play(landed, landed, 0);
      html.dataset.backdrop = piece(t).backdrop;
      html.dataset.sala = piece(t).sala;
      await wait(FADE);
      router.push("/");
      const slot = await rendered("/", piece(t).slot);
      const above = s.shot(t, "above");
      await s.play(landed, above, LAND);
      delete html.dataset.backdrop;
      await s.play(above, s.shot(t, "slot", slot), DIVE);
      s.release();
      st.busy = false;
      bind();
    };

    // Any link between the Sala and a Cajón or the Fichero flies: the 3D drawers, the DOM ones, Esc, "/", the crumbs.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || st.busy || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || reduced()) return;
      const to = new URL(a.href).pathname, from = location.pathname;
      const tTo = targetOf(to), tFrom = targetOf(from);
      if (from === "/" && tTo !== null && html.dataset.sala === "3d") { e.preventDefault(); void enter(tTo, to); }
      else if (to === "/" && tFrom !== null) { e.preventDefault(); void leave(tFrom); }
    };
    document.addEventListener("click", onClick, true);

    if (!reduced()) {
      load();
      // Arriving by URL inside the archive: the camera walks in from the Sala on its own, over the server-rendered page.
      const crumb = [...document.querySelectorAll<HTMLAnchorElement>(".crumbs a")].map((a) => targetOf(new URL(a.href).pathname)).find((t) => typeof t === "number");
      // ponytail: the route list is spelled out; a new route inside a Serie needs adding here to get the walk-in.
      if (/^\/(serie|doc|expediente)(\/|$)/.test(location.pathname) && crumb !== undefined && !st.busy) {
        st.busy = true;
        load().then(async (s) => {
          if (s) {
            const start = s.shot(crumb, "slot");
            void s.play(start, start, 0);
            html.dataset.backdrop = "wall";
            html.dataset.sala = "cajon";
            await wait(FADE + 200);
            await into(s, crumb, start, async () => document.querySelector(piece(crumb).landing));
          }
          st.busy = false;
        });
      }
    }
    return () => document.removeEventListener("click", onClick, true);
  }, []); // Once: the layout never remounts.

  // The Sala binds on every visit to "/", except mid-flight: a flight binds it itself when it lands.
  useEffect(() => {
    if (!st.busy) bind();
    return () => { if (!st.busy) st.unbind?.(); };
  }, [pathname]);

  return <canvas ref={ref} className="sala3d" aria-hidden="true" />;
}
