import { Link } from "react-router";

interface PilaBook {
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

/**
 * The flat Pila: every Manual as a book lying flat, its Lomo to the visitor, each a real link (ADR 0001).
 * It is the prerendered page, and what reduced motion and no-WebGL visitors keep.
 */
export function FlatPila({ books }: Props) {
  return (
    <ol aria-label="La Pila">
      {books.map(({ path, title, lomo, color }) => (
        <li key={path}>
          {/* A thin Lomo is shorter than a 44 px touch target: the link keeps the full height in the book's colour,
              so the stack stays unbroken and a thin book just reads a little thicker. */}
          <Link
            to={path}
            aria-label={title}
            style={{ backgroundColor: color }}
            className="flex min-h-11 items-center outline-offset-2 hover:translate-x-1.5 focus-visible:outline-2 focus-visible:outline-ink motion-safe:transition-transform"
          >
            {/* Build-time SVG from our own catalog, never visitor input. */}
            <span
              className="block w-full"
              dangerouslySetInnerHTML={{ __html: lomo }}
            />
          </Link>
        </li>
      ))}
    </ol>
  );
}
