import { lazy, type Ref, Suspense, useRef } from "react";
import { Link } from "react-router";

import { useHydrated } from "../shared/hydrated";

// The 3D chunk loads after first paint, outside the first-paint budget. If it can't load, the flat Pila stays.
const PilaView = lazy(() =>
  import("../book/book").then(
    (module) => ({ default: module.PilaView }),
    () => ({ default: () => null }),
  ),
);

export interface PilaBook {
  path: string;
  title: string;
  /** The Lomo as SVG markup, drawn at build time so the Tapa code stays out of the browser bundle. */
  lomo: string;
  /** The Tapa's background colour. */
  color: string;
}

interface Props {
  /** Top to bottom, in catalog order. */
  books: PilaBook[];
}

/** La Pila: the flat Pila, with the 3D stack layered over it once hydrated. */
export function Pila({ books }: Props) {
  const hydrated = useHydrated();
  const list = useRef<HTMLOListElement>(null);

  return (
    // Room below the list lets the last book reach the centre of the screen, where the book in focus sits; the 6rem
    // is the page's bottom padding plus half a Lomo.
    <div className="group has-[.pila-3d]:pb-[calc(50svh-6rem)]">
      {/* Room for the top book's cover, which the 3D Pila shows above its Lomo. Reserved from first paint wherever
          the 3D Pila may run, so its arrival shifts nothing. */}
      <div className="hidden aspect-4/1 motion-safe:block" />
      <FlatPila books={books} ref={list} />
      {hydrated && (
        <Suspense>
          {/* lvh: a phone's toolbar showing or hiding doesn't resize the canvas. */}
          <PilaView
            list={list}
            className="pila-3d fixed inset-x-0 top-0 z-5 h-lvh"
          />
        </Suspense>
      )}
    </div>
  );
}

interface FlatPilaProps {
  books: PilaBook[];
  ref?: Ref<HTMLOListElement>;
}

/**
 * The flat Pila: every Manual as a book lying flat, its Lomo to the visitor, each a real link (ADR 0001).
 * It is the prerendered page, and what reduced motion and no-WebGL visitors keep.
 */
function FlatPila({ books, ref }: FlatPilaProps) {
  return (
    <ol ref={ref} aria-label="La Pila" className="mt-4">
      {books.map(({ path, title, lomo, color }) => (
        <li key={path}>
          {/* A thin Lomo is shorter than a 44 px touch target: the link keeps the full height in the book's colour,
              so the stack stays unbroken and a thin book just reads a little thicker. */}
          <Link
            to={path}
            aria-label={title}
            style={{ backgroundColor: color }}
            // Two-tone focus ring, cream inside and dark outside, so it shows over a dark neighbour and over the paper alike.
            // Over the 3D Pila, a focused link scrolls toward the centre of the screen, which brings its book into focus.
            className="flex min-h-11 items-center outline-offset-2 group-has-[.pila-3d]:scroll-my-[45svh] group-has-[.pila-3d[aria-busy=false]]:bg-transparent! focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-paper focus-visible:outline-2 focus-visible:outline-ink motion-safe:transition-colors"
          >
            {/* Build-time SVG from our own catalog, never visitor input; the link's name is the title alone. Once the
                3D Pila has faded in, the Lomo hides and the link keeps its place and focus ring over the 3D book. */}
            <span
              aria-hidden="true"
              className="w-full group-has-[.pila-3d[aria-busy=false]]:opacity-0 motion-safe:transition-opacity"
              dangerouslySetInnerHTML={{ __html: lomo }}
            />
          </Link>
        </li>
      ))}
    </ol>
  );
}
