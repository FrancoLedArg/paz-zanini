import {
  lazy,
  type Ref,
  type RefObject,
  Suspense,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Link } from "react-router";

import type { coleccionesWithCount } from "../catalog/catalog";
import { useOptions } from "../filters-prototype/prototype";
import { useHydrated } from "../shared/hydrated";
import { reducedMotion } from "../shared/motion";
import { stepInView } from "../shared/track";

// The 3D chunk loads after first paint, outside the first-paint budget. If it can't load, the flat track stays.
const HeliceView = lazy(() =>
  import("../book/book").then(
    (module) => ({ default: module.HeliceView }),
    () => ({ default: () => null }),
  ),
);

interface HeliceBook {
  path: string;
  title: string;
  /** The Tapa as SVG markup, drawn at build time so the Tapa code stays out of the browser bundle. */
  tapa: string;
  /** The Recorrido step, or the place in its Colección, as two digits. */
  number: string;
  /** The Tapa's colour, for the number. */
  color: string;
  /** The Recorrido step or Carrera, the Herramientas and the page count, as one line. */
  details: string;
}

interface Props {
  /** One Colección's Manuales, in catalog order. */
  books: HeliceBook[];
  coleccion: ReturnType<typeof coleccionesWithCount>[number];
}

/** The Hélice: the flat track, with the 3D Hélice layered over it once hydrated (ADR 0003). */
export function Helice({ books, coleccion }: Props) {
  const hydrated = useHydrated();
  const track = useRef<HTMLOListElement>(null);

  return (
    <div className="group">
      <FlatTrack books={books} ref={track} />
      {/* PROTOTYPE (#75): no words, or a small centred caption under the book. The old Words are gone. */}
      <ProtoWords key={coleccion.id} books={books} track={track} />
      {hydrated && (
        <Suspense>
          {/* lvh: a phone's toolbar showing or hiding doesn't resize the canvas. */}
          <HeliceView
            track={track}
            coleccion={coleccion.id}
            className="helice-3d fixed inset-x-0 top-0 z-5 h-lvh"
          />
        </Suspense>
      )}
    </div>
  );
}

interface FlatTrackProps {
  books: HeliceBook[];
  ref: Ref<HTMLOListElement>;
}

/**
 * The flat track: one step per Manual, each its Tapa as a real link. It is the prerendered page, what reduced-motion
 * and no-WebGL visitors keep, and the track the 3D Hélice follows.
 */
function FlatTrack({ books, ref }: FlatTrackProps) {
  // PROTOTYPE (#75): the book centred on every screen; lifted a little to leave room for a caption under it.
  const { words } = useOptions();
  const place =
    words === "leyenda"
      ? "-translate-y-[7lvh] wide:-translate-y-[4lvh]"
      : "translate-y-[2lvh] wide:translate-y-[1lvh]";
  return (
    // A step as tall as the screen, so one flick moves about one book, and the first and last Tapas centre without
    // padding. The page itself is the scroll container, so the soft snap is set on <html>.
    <ol
      ref={ref}
      aria-label="Manuales"
      className="[html:has(&)]:snap-y [html:has(&)]:snap-proximity"
    >
      {books.map(({ path, title, tapa }) => (
        <li
          key={path}
          className="flex h-lvh snap-center items-center justify-center"
        >
          {/* Shifted as the 3D Hélice frames its book in focus (right of centre, or above its words on a narrow
              screen), so the 3D book fades in over its Tapa and the focus ring stays on it. */}
          <Link
            to={path}
            aria-label={title}
            // A link reached by Tab centres its step, so its book comes into focus in the Hélice.
            onFocus={(event) => {
              event.currentTarget.parentElement?.scrollIntoView({
                block: "center",
              });
            }}
            className={`${place} outline-offset-4 focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-ink`}
          >
            {/* Build-time SVG from our own catalog, never visitor input; the link's name is the title alone. 40lvh wide
                is 56lvh tall, inside the step; 72vw keeps it inside a phone's width. Once the 3D Hélice has faded in,
                the Tapa hides and the link keeps its place and focus ring over the 3D book. */}
            <span
              aria-hidden="true"
              className="block w-[min(72vw,40lvh)] group-has-[.helice-3d[aria-busy=false]]:opacity-0 motion-safe:transition-opacity"
              dangerouslySetInnerHTML={{ __html: tapa }}
            />
          </Link>
        </li>
      ))}
    </ol>
  );
}

// How far off a step, in steps, the title has fully faded (design-system Motion).
const NEAR = 0.22;

/**
 * The scroll's place, read on every scroll event, written as `--s` (steps down the track) and `--near` (1 on a step, 0 at
 * NEAR or more away) so the words move in CSS without a render per frame. Under reduced motion nothing may stay hidden.
 */
function useTrackPlace(
  track: RefObject<HTMLElement | null>,
  words: RefObject<HTMLElement | null>,
) {
  const [focus, setFocus] = useState({ step: 0, away: false });
  useLayoutEffect(() => {
    const update = () => {
      if (!track.current || !words.current) return;
      const s = stepInView(track.current);
      const step = Math.round(s);
      const off = Math.abs(s - step);
      const reduced = reducedMotion();
      const away = !reduced && off >= NEAR;
      const near = reduced ? 1 : Math.max(0, 1 - off / NEAR);
      words.current.style.setProperty("--s", String(reduced ? step : s));
      words.current.style.setProperty(
        "--near",
        String(near * near * (3 - 2 * near)),
      );
      setFocus((last) =>
        last.step === step && last.away === away ? last : { step, away },
      );
    };
    // A page restored mid-track (Back) places the words without waiting for a scroll.
    update();
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    return () => {
      removeEventListener("scroll", update);
      removeEventListener("resize", update);
    };
  }, [track, words]);
  return focus;
}

/** PROTOTYPE (#75): with `leyenda`, the title then its details, centred just under the book in focus. */
function ProtoWords({
  books,
  track,
}: {
  books: HeliceBook[];
  track: RefObject<HTMLElement | null>;
}) {
  const { words } = useOptions();
  return words === "leyenda" ? <Caption books={books} track={track} /> : null;
}

function Caption({
  books,
  track,
}: {
  books: HeliceBook[];
  track: RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLElement>(null);
  const { step, away } = useTrackPlace(track, ref);
  const book = books[step];
  if (!book) return null;
  return (
    <section
      ref={ref}
      aria-label="Manual en foco"
      // The book is min(72vw, 40lvh) wide and 1.4 times as tall, centred, then lifted as FlatTrack says.
      className="pointer-events-none fixed inset-x-0 top-[calc(43lvh_+_min(72vw,40lvh)*0.7_+_1.25rem)] z-10 px-6 text-center motion-safe:transition-[opacity,visibility] motion-safe:duration-300 wide:top-[calc(46lvh_+_min(72vw,40lvh)*0.7_+_1.5rem)] moving:invisible moving:opacity-0"
    >
      <div inert={away} className="mx-auto max-w-sm opacity-[var(--near,1)]">
        <p className="font-serif text-lg leading-tight text-balance lg:text-xl">
          <Link
            to={book.path}
            className="pointer-events-auto inline-flex min-h-11 items-center outline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ink"
          >
            {book.title}
          </Link>
        </p>
        <p className="text-xs text-ink-muted">
          <span style={{ color: book.color }}>{book.number}</span> ·{" "}
          {book.details}
        </p>
      </div>
    </section>
  );
}
