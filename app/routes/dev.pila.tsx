import { lazy, Suspense, useSyncExternalStore } from "react";
import { Link, useSearchParams } from "react-router";

import { findManual, type Manual } from "../catalog/catalog";
import { Lomo } from "../tapa/tapa";

// Design review: a small Pila, and `verify`'s Pila pose pages (`?pose=`). Development only (see app/routes.ts).
const PilaView = lazy(() =>
  import("../book/book").then((module) => ({ default: module.PilaView })),
);

// Top to bottom; the thinnest and thickest Manuales and every colour family.
const PILA_SLUGS = [
  "estadistica-descriptiva-desde-cero",
  "guia-para-un-buen-analisis-de-datos",
  "estadistica-aplicada-obstetricia",
  "estadistica-aplicada-informatica",
  "series-de-tiempo-aplicadas",
  "analisis-exploratorio-de-datos-r",
];
const PILA_MANUALES = PILA_SLUGS.map(findManual).filter(
  (manual): manual is Manual => manual !== undefined,
);

const subscribe = () => () => undefined;

export default function DevPila() {
  const [params] = useSearchParams();
  const pose = params.has("pose");
  // WebGL and the browser's media queries exist only on the client.
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  // Busy from first paint until the view reveals itself, so `pnpm shots` never captures it early.
  const loading = <div aria-busy="true" />;
  return (
    <main className={pose ? "h-svh" : "h-[400svh]"}>
      {mounted ? (
        <Suspense fallback={loading}>
          <PilaView
            manuales={PILA_MANUALES}
            className="sticky top-0 h-svh"
            fallback={
              // Stand-in for the flat Pila (#14).
              <ul className="mx-auto max-w-md space-y-1 p-4">
                {PILA_MANUALES.map((manual) => (
                  <li key={manual.slug}>
                    <Lomo manual={manual} className="block w-full" />
                  </li>
                ))}
              </ul>
            }
          />
        </Suspense>
      ) : (
        loading
      )}
      {!pose && (
        <Link
          to="/dev/book"
          className="fixed bottom-4 left-1/2 flex min-h-11 -translate-x-1/2 items-center text-sm underline"
        >
          Ver un Manual
        </Link>
      )}
    </main>
  );
}
