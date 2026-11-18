import {
  lazy,
  type Ref,
  type RefObject,
  Suspense,
  useRef,
  useSyncExternalStore,
} from "react";
import { Link } from "react-router";

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
  /** In catalog order. */
  books: HeliceBook[];
}

/** The Hélice: the flat track, with the 3D Hélice layered over it once hydrated (ADR 0003). */
export function Helice({ books }: Props) {
  const hydrated = useHydrated();
  const track = useRef<HTMLOListElement>(null);

  return (
    <div className="group">
      <FlatTrack books={books} ref={track} />
      <Words books={books} track={track} />
      {hydrated && (
        <Suspense>
          {/* lvh: a phone's toolbar showing or hiding doesn't resize the canvas. */}
          <HeliceView
            track={track}
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
    // 19lvh above and below a 62lvh step lets the first and last Tapas snap to the centre of the screen. The page
    // itself is the scroll container, so the soft snap is set on <html>.
    <ol
      ref={ref}
      aria-label="Manuales"
      className="py-[19lvh] [html:has(&)]:snap-y [html:has(&)]:snap-proximity"
    >
      {books.map(({ path, title, tapa }) => (
        <li
          key={path}
          className="flex h-[62lvh] snap-center items-center justify-center"
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

const subscribeToScroll = (onChange: () => void) => {
  addEventListener("scroll", onChange, { passive: true });
  addEventListener("resize", onChange);
  return () => {
    removeEventListener("scroll", onChange);
    removeEventListener("resize", onChange);
  };
};

/** The index of the step in view; the first while the page is prerendered and hydrating. */
function useStepInView(track: RefObject<HTMLElement | null>): number {
  return useSyncExternalStore(
    subscribeToScroll,
    () => (track.current ? Math.round(stepInView(track.current)) : 0),
    () => 0,
  );
}

interface WordsProps {
  books: HeliceBook[];
  track: RefObject<HTMLElement | null>;
}

/**
 * The words of the book in focus, large: under the book on a phone, in the left column beside the Hélice when wider.
 * No live region: the track's links are the screen-reader path, and a live region would chatter on scroll.
 */
function Words({ books, track }: WordsProps) {
  // Here, not in Helice, so a change of focus re-renders the words alone, never the track's Tapas.
  const book = books[useStepInView(track)];
  if (!book) return null;
  return (
    <section
      // A new book remounts the words, so each swap rises in.
      key={book.path}
      aria-label="Manual en foco"
      // Taps outside the title reach the books under it. On a narrow screen the flat track's next Tapa rises under the
      // words, so paper fades in behind them until the 3D Hélice, whose far books are already pale, has faded in.
      className="pointer-events-none fixed inset-x-0 bottom-0 z-10 bg-linear-to-t from-paper from-70% px-4 pt-12 pb-6 group-has-[.helice-3d[aria-busy=false]]:bg-none lg:w-[24vw] wide:inset-x-auto wide:top-1/2 wide:bottom-auto wide:left-16 wide:w-[32vw] wide:max-w-104 wide:-translate-y-1/2 wide:bg-none wide:p-0"
    >
      <p className="flex items-baseline gap-3 motion-safe:animate-rise-in">
        <span
          className="font-serif text-4xl leading-none font-light lg:text-8xl"
          style={{ color: book.color }}
        >
          {book.number}
        </span>
        <span className="text-xs tracking-widest text-ink-muted uppercase">
          {book.coleccion}
        </span>
      </p>
      <p className="mt-2 font-serif text-3xl leading-tight font-semibold text-balance motion-safe:animate-rise-in motion-safe:[animation-delay:60ms] lg:mt-4 lg:text-5xl wide:max-lg:text-2xl">
        <Link
          to={book.path}
          className="pointer-events-auto inline-block min-h-11 outline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ink"
        >
          {book.title}
        </Link>
      </p>
      <p className="mt-2 text-sm text-ink-muted motion-safe:animate-rise-in motion-safe:[animation-delay:120ms]">
        {book.details}
      </p>
    </section>
  );
}
