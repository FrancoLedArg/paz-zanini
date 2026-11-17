import { Link } from "react-router";

import {
  COLECCIONES,
  findManual,
  type Manual,
  manualPath,
  pdfPath,
  recorrido,
  recorridoStep,
} from "../catalog/catalog";
import { Tapa } from "../tapa/tapa";

const LICENSE_URL = "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.es";

interface Props {
  manual: Manual;
}

export function ManualPage({ manual }: Props) {
  const coleccion = COLECCIONES.find(({ id }) => id === manual.coleccion);
  const step = recorridoStep(manual);
  const par = manual.par ? findManual(manual.par) : undefined;
  const facts = [
    manual.coleccion === "estadistica-aplicada" &&
      `Para estudiantes de ${manual.carrera}`,
    manual.herramientas.length > 0 && `Con ${manual.herramientas.join(" y ")}`,
    `${manual.pages} páginas`,
  ].filter(Boolean);

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
          <Tapa
            manual={manual}
            className="mx-auto block w-3/5 max-w-sm shadow-tapa md:sticky md:top-10 md:w-full"
          />
        </div>
        <article>
          <p className="text-xs font-semibold tracking-widest text-ink-muted uppercase">
            {coleccion?.name}
            {step !== undefined && ` · Paso ${step}`}
          </p>
          <h1 className="mt-3 font-serif text-3xl leading-tight font-semibold text-balance sm:text-4xl">
            {manual.title}
          </h1>
          <p className="mt-4 text-lg text-pretty text-ink-muted">
            {manual.subtitle}
          </p>
          <p className="mt-4 text-sm">{facts.join(" · ")}</p>

          <a
            href={pdfPath(manual)}
            download
            className="mt-8 inline-flex min-h-12 items-center rounded-full bg-ink px-7 font-semibold text-paper transition-opacity hover:opacity-85"
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
              También está en {par.herramientas.join(" y ")}:{" "}
              <Link
                to={manualPath(par)}
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

          {manual.coleccion !== "estadistica-aplicada" &&
            step !== undefined && (
              <Recorrido
                steps={recorrido(manual.coleccion)}
                step={step}
                name={coleccion?.name ?? ""}
              />
            )}
        </article>
      </main>
    </div>
  );
}

interface RecorridoProps {
  steps: Manual[][];
  /** 1-based, as `recorridoStep` returns it. */
  step: number;
  name: string;
}

function Recorrido({ steps, step, name }: RecorridoProps) {
  const neighbours = [
    { label: "Anterior", manuales: steps[step - 2] ?? [] },
    { label: "Siguiente", manuales: steps[step] ?? [] },
  ].filter(({ manuales }) => manuales.length > 0);

  return (
    <nav aria-label="Recorrido" className="mt-10 border-t border-rule pt-6">
      <p className="text-sm text-ink-muted">
        Paso {step} de {steps.length} del Recorrido de {name}
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {neighbours.map(({ label, manuales }) => (
          <div key={label}>
            <p className="text-xs font-semibold tracking-widest text-ink-muted uppercase">
              {label}
            </p>
            <ul className="mt-1 space-y-2">
              {manuales.map((manual) => (
                <li key={manual.slug}>
                  <Link
                    to={manualPath(manual)}
                    className="flex min-h-11 items-center font-serif font-semibold text-balance underline decoration-rule underline-offset-4 hover:decoration-ink"
                  >
                    {manual.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
