import {
  lazy,
  type Ref,
  type RefObject,
  Suspense,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Link } from "react-router";

import type { ColeccionId } from "../catalog/catalog";
import { useColecciones } from "../shared/coleccion";
import { useHydrated } from "../shared/hydrated";
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
  coleccionId: ColeccionId;
  /** The Tapa as SVG markup, drawn at build time so the Tapa code stays out of the browser bundle. */
  tapa: string;
  /** The Recorrido step, or the place in its Colección, as two digits. */
  number: string;
  coleccion: string;
  /** The Tapa's colour, for the number. */
  color: string;
  /** The Recorrido step or Carrera, the Herramientas and the page count, as one line. */
  details: string;
}

interface Props {
  /** In catalog order, narrowed to the Colección chosen in the menu, if any. */
  books: HeliceBook[];
  /** The Colección the books are narrowed to; null for every Manual. */
  coleccion: ColeccionId | null;
}

/** The Hélice: the flat track, with the 3D Hélice layered over it once hydrated (ADR 0003). */
export function Helice({ books, coleccion }: Props) {
  const hydrated = useHydrated();
  const track = useRef<HTMLOListElement>(null);

  return (
    <div className="group">
      <FirstPaintFilter />
      <FlatTrack books={books} ref={track} />
      {/* A new Colección starts the words afresh, on its first book. */}
      <Words key={coleccion} books={books} track={track} />
      {hydrated && (
        <Suspense>
          {/* lvh: a phone's toolbar showing or hiding doesn't resize the canvas. */}
          <HeliceView
            track={track}
            coleccion={coleccion}
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
      {books.map(({ path, title, tapa, coleccionId }) => (
        <li
          key={path}
          data-coleccion={coleccionId}
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

/**
 * A shared `?coleccion=` link narrows the track before first paint, so nothing jumps once React narrows it after
 * hydration: the script flags <html> with a known Colección as the HTML is parsed, and CSS hides the other Colecciones'
 * steps, and the words (which still name every Manual's first book), until then.
 */
function FirstPaintFilter() {
  const ids = useColecciones().map(({ id }) => id);
  const hydrated = useHydrated();
  useEffect(() => {
    // The track is narrowed by now (every useHydrated flips in the same render), so the flag can go.
    if (hydrated) delete document.documentElement.dataset.coleccion;
  }, [hydrated]);
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `(function () {
  var c = new URLSearchParams(location.search).get("coleccion");
  if (${JSON.stringify(ids)}.indexOf(c) >= 0) document.documentElement.dataset.coleccion = c;
})();`,
        }}
      />
      <style>
        {ids
          .map(
            (id) =>
              `html[data-coleccion="${id}"] li[data-coleccion]:not([data-coleccion="${id}"]) { display: none; }`,
          )
          .join("\n") +
          '\nhtml[data-coleccion] section[aria-label="Manual en foco"] { visibility: hidden; }'}
      </style>
    </>
  );
}

const subscribeToScroll = (onChange: () => void) => {
  addEventListener("scroll", onChange, { passive: true });
  addEventListener("resize", onChange);
  return () => {
    removeEventListener("scroll", onChange);
    removeEventListener("resize", onChange);
  };
};

/** Whether the scroll has moved a quarter step or more off a step: its book is leaving focus. */
function useAway(track: RefObject<HTMLElement | null>, step: number): boolean {
  return useSyncExternalStore(
    subscribeToScroll,
    () =>
      track.current
        ? Math.abs(stepInView(track.current) - step) >= 0.25
        : false,
    () => false,
  );
}

// How long the scroll must rest before the words name the book in view (design-system Motion).
const REST_MS = 180;

/** The index of the step in view, updated only once the scroll has rested on it; the first until then. */
function useRestingStep(track: RefObject<HTMLElement | null>): number {
  const [resting, setResting] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (track.current) setResting(Math.round(stepInView(track.current)));
      }, REST_MS);
    };
    // A page restored mid-track (Back) names its book without waiting for a scroll.
    onScroll();
    const unsubscribe = subscribeToScroll(onScroll);
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [track]);
  return resting;
}

interface WordsProps {
  books: HeliceBook[];
  track: RefObject<HTMLElement | null>;
}

/**
 * The words of the book in focus, small, in the bottom-left corner: they fade out as soon as the focus leaves their
 * book, and the next book's words rise in once the scroll rests, so a flick never flashes the titles it passes.
 * No live region: the track's links are the screen-reader path, and a live region would chatter on scroll.
 */
function Words({ books, track }: WordsProps) {
  // Here, not in Helice, so a change of focus re-renders the words alone, never the track's Tapas.
  const resting = useRestingStep(track);
  const away = useAway(track, resting);
  const book = books[resting];
  if (!book) return null;
  return (
    <section
      aria-label="Manual en foco"
      // Taps outside the title reach the books under it. On a narrow screen the words stick to the bottom of the
      // screen until the track ends, then leave with it, and the flat track's next Tapa rises under them, so paper
      // fades in behind them until the 3D Hélice, whose far books are already pale, has faded in.
      className="pointer-events-none sticky bottom-0 z-10 bg-linear-to-t from-paper from-70% px-4 pt-12 pb-5 group-has-[.helice-3d[aria-busy=false]]:bg-none wide:fixed wide:bottom-12 wide:left-16 wide:w-[30vw] wide:max-w-88 wide:bg-none wide:p-0"
    >
      {/* A new book remounts the text alone, so each swap rises in. Away from its book it fades and leaves the tab
          order, so it never names a book that isn't in focus. */}
      <div
        key={book.path}
        inert={away}
        className={`motion-safe:transition-opacity motion-safe:duration-200 motion-safe:ease-settle ${away ? "opacity-0" : ""}`}
      >
        <p className="flex items-baseline gap-3 motion-safe:animate-rise-in">
          <span
            className="font-serif text-2xl leading-none font-light lg:text-4xl"
            style={{ color: book.color }}
          >
            {book.number}
          </span>
          <span className="text-xs tracking-widest text-ink-muted uppercase">
            {book.coleccion}
          </span>
        </p>
        <p className="mt-1 font-serif text-xl leading-tight text-balance motion-safe:animate-rise-in motion-safe:[animation-delay:60ms] lg:mt-2 lg:text-2xl">
          <Link
            to={book.path}
            className="pointer-events-auto inline-flex min-h-11 items-center outline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ink"
          >
            {book.title}
          </Link>
        </p>
        <p className="text-xs text-ink-muted motion-safe:animate-rise-in motion-safe:[animation-delay:120ms]">
          {book.details}
        </p>
      </div>
    </section>
  );
}
