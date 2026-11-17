import { lazy, Suspense } from "react";
import { Link } from "react-router";

import type { Manual } from "../catalog/catalog";
import { useHydrated } from "../shared/hydrated";

// The 3D chunk loads after first paint, outside the first-paint budget.
const TurnableBookView = lazy(() =>
  import("../book/book").then((module) => ({
    default: module.TurnableBookView,
  })),
);

const LICENSE_URL = "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.es";

interface ManualLink {
  path: string;
  title: string;
  /** The Herramientas it teaches with, joined for a sentence ("R y Python"). */
  herramientas: string;
}

/** Worked out at build time by the route loader, so neither the catalog nor the Tapa code ships to the browser. */
interface Props {
  manual: Manual;
  /** The Tapa as SVG markup. */
  tapa: string;
  pdf: string;
  coleccion: string;
  par: ManualLink | undefined;
  recorrido:
    | undefined
    | {
        step: number;
        total: number;
        previous: ManualLink[];
        next: ManualLink[];
      };
}

export function ManualPage({
  manual,
  tapa,
  pdf,
  coleccion,
  par,
  recorrido,
}: Props) {
  const facts = [
    manual.coleccion === "estadistica-aplicada" &&
      `Para estudiantes de ${manual.carrera}`,
    manual.herramientas.length > 0 && `Con ${manual.herramientas.join(" y ")}`,
    `${manual.pages} páginas`,
  ].filter(Boolean);
  // WebGL and the browser's media queries exist only on the client.
  const hydrated = useHydrated();

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-8">
      <header className="py-5">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center font-serif text-lg font-semibold"
        >
          Manuales
        </Link>
      </header>
      <main className="grid gap-10 pt-2 pb-20 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-16 md:pt-8">
        <div>
          {/* The book fills 70% of its stage's height, as the Tapa does, so the 3D fades in over it without a shift. */}
          <div className="relative mx-auto aspect-3/4 max-w-xs md:sticky md:top-10 md:max-w-none">
            {/* Build-time SVG from our own catalog, never visitor input. */}
            <div
              className="flex h-full items-center justify-center"
              dangerouslySetInnerHTML={{ __html: tapa }}
            />
            {hydrated && (
              <Suspense>
                {/* Opaque paper hides the Tapa once the book is in; on any 3D failure the Tapa shows again. */}
                <TurnableBookView
                  manual={manual}
                  fallback={null}
                  className="absolute inset-0 bg-paper"
                />
              </Suspense>
            )}
          </div>
        </div>
        <article>
          <p className="text-xs font-semibold tracking-widest text-ink-muted uppercase">
            {coleccion}
            {recorrido && ` · Paso ${recorrido.step}`}
          </p>
          <h1 className="mt-3 font-serif text-3xl leading-tight font-semibold text-balance sm:text-4xl">
            {manual.title}
          </h1>
          <p className="mt-4 text-lg text-pretty text-ink-muted">
            {manual.subtitle}
          </p>
          <p className="mt-4 text-sm">{facts.join(" · ")}</p>

          <a
            href={pdf}
            download
            className="mt-8 inline-flex min-h-12 items-center rounded-full bg-ink px-7 font-semibold text-paper hover:opacity-85 motion-safe:transition-opacity"
          >
            Descargar manual
          </a>
          <p className="mt-3 text-sm text-ink-muted">
            Es gratis, con licencia{" "}
            <a href={LICENSE_URL} className="underline underline-offset-2">
              CC BY-NC-SA 4.0
            </a>
            .
          </p>

          {par && (
            <p className="mt-8 border-t border-rule pt-5">
              También está en {par.herramientas}:{" "}
              <Link
                to={par.path}
                className="font-serif font-semibold underline underline-offset-4"
              >
                {par.title}
              </Link>
            </p>
          )}

          <section aria-labelledby="contenido" className="mt-10">
            <h2 id="contenido" className="font-serif text-xl font-semibold">
              Qué vas a aprender
            </h2>
            <ol className="mt-4 list-decimal space-y-2 pl-6 marker:text-ink-muted">
              {manual.contents.map((unit) => (
                <li key={unit} className="pl-1">
                  {unit}
                </li>
              ))}
            </ol>
          </section>

          {recorrido && (
            <nav
              aria-label="Recorrido"
              className="mt-10 border-t border-rule pt-6"
            >
              <p className="text-sm text-ink-muted">
                Paso {recorrido.step} de {recorrido.total} del Recorrido de{" "}
                {coleccion}
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {[
                  { label: "Anterior", links: recorrido.previous },
                  { label: "Siguiente", links: recorrido.next },
                ]
                  .filter(({ links }) => links.length > 0)
                  .map(({ label, links }) => (
                    <div key={label}>
                      <p className="text-xs font-semibold tracking-widest text-ink-muted uppercase">
                        {label}
                      </p>
                      <ul className="mt-1 space-y-2">
                        {links.map(({ path, title }) => (
                          <li key={path}>
                            <Link
                              to={path}
                              className="flex min-h-11 items-center font-serif font-semibold text-balance underline decoration-rule underline-offset-4 hover:decoration-ink"
                            >
                              {title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            </nav>
          )}
        </article>
      </main>
    </div>
  );
}
