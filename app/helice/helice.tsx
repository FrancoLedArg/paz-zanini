import { Link } from "react-router";

interface HeliceBook {
  path: string;
  title: string;
  /** The Tapa as SVG markup, drawn at build time so the Tapa code stays out of the browser bundle. */
  tapa: string;
}

interface Props {
  /** In catalog order. */
  books: HeliceBook[];
}

/**
 * The flat track: one step per Manual, each its Tapa as a real link (ADR 0003). It is the prerendered page, what
 * reduced-motion and no-WebGL visitors keep, and the track the 3D Hélice follows.
 */
export function Helice({ books }: Props) {
  return (
    // 19lvh above and below a 62lvh step lets the first and last Tapas snap to the centre of the screen. The page
    // itself is the scroll container, so the soft snap is set on <html>.
    <ol
      aria-label="Manuales"
      className="py-[19lvh] [html:has(&)]:snap-y [html:has(&)]:snap-proximity"
    >
      {books.map(({ path, title, tapa }) => (
        <li
          key={path}
          className="flex h-[62lvh] snap-center items-center justify-center"
        >
          <Link
            to={path}
            aria-label={title}
            className="outline-offset-4 focus-visible:outline-2 focus-visible:outline-ink"
          >
            {/* Build-time SVG from our own catalog, never visitor input; the link's name is the title alone. 40lvh wide
                is 56lvh tall, inside the step; 72vw keeps it inside a phone's width. */}
            <span
              aria-hidden="true"
              className="block w-[min(72vw,40lvh)]"
              dangerouslySetInnerHTML={{ __html: tapa }}
            />
          </Link>
        </li>
      ))}
    </ol>
  );
}
