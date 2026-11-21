import { useEffect, useState, useSyncExternalStore } from "react";

import { loadProgress, subscribeToProgress } from "../shared/progress";

/** sessionStorage key: set once the cover has been shown, so it shows once per session. */
export const LOADER_SEEN = "loader-seen";

// Runs as the prerendered HTML is parsed, before the first frame, so the cover is up from the start or never (no flash).
// It flags <html> only on a first visit in the session, without reduced motion, and where WebGL2 really runs; without
// JavaScript it never runs, so there is no cover. Its probe twins supportsWebGL2 in app/book/scene.tsx: keep them alike. A client-side navigation home doesn't run it either.
const FIRST_VISIT_SCRIPT = `try {
  if (!sessionStorage.getItem("${LOADER_SEEN}") && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var gl = document.createElement("canvas").getContext("webgl2");
    if (gl) {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      sessionStorage.setItem("${LOADER_SEEN}", "1");
      document.documentElement.dataset.loader = "";
    }
  }
} catch (error) {}`;

/**
 * The first-visit cover (#32): the Autor's name and a count of the 3D Hélice's real work (its covers drawn, then its
 * shaders compiled). It lifts once the Hélice has faded in, as soon as keyboard focus lands on the page under it, or at
 * the cap whatever happens, in CSS alone, so a failed script never leaves it up. Presentation only: hidden from assistive
 * tech, and the page under it is the content.
 */
export function Loader() {
  const progress = useSyncExternalStore(
    subscribeToProgress,
    loadProgress,
    loadProgress,
  );
  // The covers finish together, so the real progress arrives in steps; the count runs up to each, a few points a frame.
  const target = Math.round(progress * 100);
  const [count, setCount] = useState(0);
  useEffect(() => {
    // Only while the cover is up: a later visit's hidden cover has nothing to count.
    if (count >= target || !("loader" in document.documentElement.dataset))
      return;
    const frame = requestAnimationFrame(() => {
      setCount((n) => Math.min(n + 3, target));
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [count, target]);
  return (
    <>
      {/* The script runs from the prerendered HTML, so only the build carries its text; hydration leaves it as it is (#83). */}
      <script
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: import.meta.env.SSR ? FIRST_VISIT_SCRIPT : "",
        }}
      />
      <div
        aria-hidden="true"
        data-testid="loader"
        // Once lifted, the first visit is over: coming back home later in the session goes straight to the page.
        onAnimationEnd={() => {
          delete document.documentElement.dataset.loader;
        }}
        className="fixed inset-0 z-20 hidden animate-lift flex-col justify-between bg-paper px-4 pt-3 pb-6 lg:px-16 lg:pt-8 lg:pb-16 [html:has(.helice-3d[aria-busy=false],:focus-visible)_&]:animate-lift-now [html[data-loader]_&]:flex"
      >
        {/* Where the header sets the name on the page, so the cover reads as the page's own first frame. */}
        <p className="flex min-h-11 items-center font-serif text-lg tracking-tight lg:text-2xl">
          Raúl E. Paz Zanini
        </p>
        <p className="flex items-baseline justify-between gap-6">
          <span className="text-xs tracking-widest text-ink-muted uppercase">
            Manuales de estadística y ciencia de datos
          </span>
          <span className="font-serif text-6xl leading-none font-light tabular-nums lg:text-9xl">
            {String(count).padStart(2, "0")}
          </span>
        </p>
      </div>
    </>
  );
}
