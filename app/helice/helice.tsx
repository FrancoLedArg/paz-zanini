import { lazy, type Ref, Suspense, useRef } from "react";
import { Link } from "react-router";

import type { ColeccionId } from "../catalog/catalog";
import { useHydrated } from "../shared/hydrated";

export { Filters } from "./filters";

// The 3D chunk loads after first paint, outside the first-paint budget. If it can't load, the flat track stays.
const HeliceView = lazy(() =>
  import("../book/book").then(
    (module) => ({ default: module.HeliceView }),
    () => ({ default: () => null }),
  ),
);
// The record shows only once the scroll rests, which needs JS anyway: it loads after first paint too, and a page whose
// chunk fails to load does without it.
const BookRecord = lazy(() =>
  import("./record").then(
    (module) => ({ default: module.BookRecord }),
    () => ({ default: () => null }),
  ),
);

/** One row of the record of the book in focus. */
export type Fact = [label: string, value: string];

interface HeliceBook {
  path: string;
  title: string;
  /** The Tapa as SVG markup, drawn at build time so the Tapa code stays out of the browser bundle. */
  tapa: string;
  /** The record's rows: the Paso (or Carrera), the Herramientas and the page count, each a label and a value. */
  facts: Fact[];
}

interface Props {
  /** One Colección's Manuales, in catalog order. */
  books: HeliceBook[];
  coleccion: ColeccionId;
}

/** The Hélice: the flat track, with the 3D Hélice layered over it once hydrated (ADR 0003). */
export function Helice({ books, coleccion }: Props) {
  const hydrated = useHydrated();
  const track = useRef<HTMLOListElement>(null);

  return (
    <div className="group">
      <FlatTrack books={books} ref={track} />
      {hydrated && (
        <Suspense>
          <BookRecord books={books} track={track} />
        </Suspense>
      )}
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
    // A step as tall as the screen, and the first and last Tapas centre without padding. Every flick comes to rest on
    // the next book (mandatory snap, and no step skipped). The page itself is the scroll container, so the snap is set
    // on <html>.
    <ol
      ref={ref}
      aria-label="Manuales"
      className="[html:has(&)]:snap-y [html:has(&)]:snap-mandatory"
    >
      {books.map(({ path, title, tapa }) => (
        <li
          key={path}
          className="flex h-lvh snap-center snap-always items-center justify-center"
        >
          {/* Below lg, centred in the band between the filters and the record above (11rem) and the logo below (4rem);
              from lg up, centred a touch low to clear the filters. The 3D Hélice frames its book in focus where this
              link is, so the 3D book fades in over its Tapa and the focus ring stays on it. */}
          <Link
            to={path}
            aria-label={title}
            // A link reached by Tab centres its step, so its book comes into focus in the Hélice.
            onFocus={(event) => {
              event.currentTarget.parentElement?.scrollIntoView({
                block: "center",
              });
            }}
            className="translate-y-14 outline-offset-4 focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-ink lg:translate-y-[1lvh]"
          >
            {/* Build-time SVG from our own catalog, never visitor input; the link's name is the title alone. 50lvh wide
                is 70lvh tall, inside the step; 84vw keeps it inside a phone's width, and below lg it fits the band. Once the 3D Hélice has faded in,
                the Tapa hides and the link keeps its place and focus ring over the 3D book. */}
            <span
              aria-hidden="true"
              className="block w-[min(84vw,50lvh,calc((100lvh-15rem)/1.4))] group-has-[.helice-3d[aria-busy=false]]:opacity-0 motion-safe:transition-opacity lg:w-[min(84vw,50lvh)]"
              dangerouslySetInnerHTML={{ __html: tapa }}
            />
          </Link>
        </li>
      ))}
    </ol>
  );
}
