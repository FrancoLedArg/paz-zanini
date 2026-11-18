import { lazy, type Ref, Suspense, useRef } from "react";
import { Link } from "react-router";

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
            className="translate-x-[10vw] outline-offset-4 focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-ink [@media(max-aspect-ratio:4/5)]:translate-x-0 [@media(max-aspect-ratio:4/5)]:-translate-y-[13lvh]"
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
