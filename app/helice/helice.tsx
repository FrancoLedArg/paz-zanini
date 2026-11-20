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
      {/* A new Colección starts the words afresh, on its first book. */}
      <Words
        key={coleccion.id}
        books={books}
        coleccion={coleccion}
        track={track}
      />
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
            className="-translate-y-[13lvh] outline-offset-4 focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-ink wide:translate-x-[10vw] wide:translate-y-0"
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

interface WordsProps {
  books: HeliceBook[];
  coleccion: Props["coleccion"];
  track: RefObject<HTMLElement | null>;
}

/**
 * The words of the book in focus ("Rótulo", design-system Layout and Motion): the odometer never names a book before it
 * arrives. No live region: the track's links are the screen-reader path, and a live region would chatter on scroll.
 */
function Words({ books, coleccion, track }: WordsProps) {
  const ref = useRef<HTMLElement>(null);
  // Here, not in Helice, so a change of focus re-renders the words alone, never the track's Tapas.
  const { step, away } = useTrackPlace(track, ref);
  const book = books[step];
  if (!book) return null;
  return (
    <section
      ref={ref}
      aria-label="Manual en foco"
      // Taps outside the title reach the books under it. On a narrow screen the words stick to the bottom of the
      // screen until the track ends, then leave with it, and the flat track's next Tapa rises under them, so paper
      // fades in behind them until the 3D Hélice, whose far books are already pale, has faded in.
      className="pointer-events-none sticky bottom-0 z-10 bg-linear-to-t from-paper from-60% px-4 pt-14 pb-12 group-has-[.helice-3d[aria-busy=false]]:bg-none wide:fixed wide:bottom-12 wide:left-16 wide:w-[30vw] wide:max-w-88 wide:bg-none wide:p-0"
    >
      <p className="text-xs tracking-widest text-ink uppercase motion-safe:animate-rise-in">
        {coleccion.numeral} · {coleccion.name}
      </p>
      {/* Hidden while a Colección's books leave and the next arrive; they come back as the new book settles. */}
      <div className="motion-safe:transition-opacity motion-safe:duration-300 [html[data-helice=arriving]_&]:opacity-0 [html[data-helice=leaving]_&]:opacity-0">
        <p className="mt-3 flex items-baseline gap-2">
          <span className="sr-only">{book.number}</span>
          <span
            aria-hidden="true"
            className="inline-block h-[1em] overflow-hidden font-serif text-4xl leading-none font-light lg:text-5xl"
          >
            {/* Each number sits 1.3em below the last, so a resting number has clean paper under it in its 1em window. */}
            <span className="block translate-y-[calc(var(--s,0)*-1.3em)]">
              {books.map(({ path, number, color }) => (
                <span key={path} className="block h-[1.3em]" style={{ color }}>
                  {number}
                </span>
              ))}
            </span>
          </span>
          <span className="text-xs text-ink-muted tabular-nums">
            / {String(coleccion.count).padStart(2, "0")}
          </span>
        </p>
        {/* Away from its book the title is faded out and inert, so it never names a book that isn't in focus. */}
        <div inert={away}>
          <p className="mt-1 translate-y-[calc((1_-_var(--near,1))*0.6rem)] font-serif text-xl leading-tight text-balance opacity-[var(--near,1)] blur-[calc((1_-_var(--near,1))*5px)] lg:mt-2 lg:text-2xl">
            <Link
              to={book.path}
              className="pointer-events-auto inline-flex min-h-11 items-center outline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ink"
            >
              {book.title}
            </Link>
          </p>
          <p className="text-xs text-ink-muted opacity-[var(--near,1)]">
            {book.details}
          </p>
        </div>
      </div>
    </section>
  );
}
