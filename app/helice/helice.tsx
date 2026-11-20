import { lazy, type Ref, Suspense, useRef } from "react";
import { Link } from "react-router";

import type { coleccionesWithCount } from "../catalog/catalog";
import { useHydrated } from "../shared/hydrated";

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
      {/* PROTOTYPE (#75): the words are gone. */}
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
  // PROTOTYPE (#75): the book centred on every screen, a touch low to clear the filters.
  const place = "translate-y-[2lvh] wide:translate-y-[1lvh]";
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
