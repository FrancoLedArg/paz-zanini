import { lazy, Suspense } from "react";
import { Link, useSearchParams } from "react-router";

import { useHydrated } from "../shared/hydrated";
import { findManual, MANUALES } from "../catalog/catalog";
import { Tapa } from "../tapa/tapa";

// Design review: the turnable book, and `verify`'s book pose pages (`?pose=`). Development only (see app/routes.ts).
const TurnableBookView = lazy(() =>
  import("../book/book").then((module) => ({
    default: module.TurnableBookView,
  })),
);

const DEFAULT_MANUAL = "estadistica-descriptiva-desde-cero";

export default function DevBook() {
  const [params, setParams] = useSearchParams();
  const manual =
    findManual(params.get("manual") ?? "") ?? findManual(DEFAULT_MANUAL);
  // WebGL and the browser's media queries exist only on the client.
  const mounted = useHydrated();
  if (!manual) return null;
  // Busy from first paint until the view reveals itself, so `pnpm shots` never captures it early.
  const loading = <div aria-busy="true" />;
  return (
    <main className="relative h-svh overflow-hidden">
      {mounted ? (
        <Suspense fallback={loading}>
          <TurnableBookView
            manual={manual}
            className="absolute inset-0"
            fallback={
              <Tapa manual={manual} className="mx-auto h-full max-w-full p-8" />
            }
          />
        </Suspense>
      ) : (
        loading
      )}
      {!params.has("pose") && (
        <nav className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-4 p-4 text-sm">
          <select
            aria-label="Manual"
            value={manual.slug}
            onChange={(event) => {
              setParams({ manual: event.target.value });
            }}
            className="min-h-11 max-w-60 rounded border border-black/20 bg-white/70 px-2"
          >
            {MANUALES.map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.title}
              </option>
            ))}
          </select>
          <Link to="/dev/pila" className="flex min-h-11 items-center underline">
            Ver la Pila
          </Link>
        </nav>
      )}
    </main>
  );
}
