import { renderToStaticMarkup } from "react-dom/server";
import { data } from "react-router";

import {
  coleccionName,
  findManual,
  type Manual,
  manualPath,
  pdfPath,
  recorrido,
  recorridoStep,
} from "../catalog/catalog";
import { ManualPage } from "../manual/manual";
import { Tapa } from "../tapa/tapa";
import type { Route } from "./+types/manual";

// Runs only at build time (ADR 0002): the catalog and the Tapa code stay out of the browser bundle.
export function loader({ params }: Route.LoaderArgs) {
  const manual = findManual(params.slug);
  // eslint-disable-next-line @typescript-eslint/only-throw-error -- React Router renders a thrown 404 in the ErrorBoundary.
  if (!manual) throw data(null, { status: 404 });

  const link = (other: Manual) => ({
    path: manualPath(other),
    title: other.title,
    herramientas: other.herramientas.join(" y "),
  });
  const par = manual.par ? findManual(manual.par) : undefined;
  const step = recorridoStep(manual);
  const steps =
    manual.coleccion === "estadistica-aplicada"
      ? []
      : recorrido(manual.coleccion);

  return {
    manual,
    tapa: renderToStaticMarkup(
      <Tapa manual={manual} className="h-[70%] w-auto shadow-tapa" />,
    ),
    pdf: pdfPath(manual),
    coleccion: coleccionName(manual.coleccion),
    par: par && link(par),
    recorrido:
      step === undefined
        ? undefined
        : {
            step,
            total: steps.length,
            previous: (steps[step - 2] ?? []).map(link),
            next: (steps[step] ?? []).map(link),
          },
  };
}

// shortcut: no og:image yet, link previews need an absolute raster Tapa; add one once the site has a domain.
export const meta: Route.MetaFunction = ({ loaderData: { manual } }) => [
  { title: `${manual.title} · Raúl E. Paz Zanini` },
  { name: "description", content: manual.subtitle },
  { property: "og:type", content: "book" },
  { property: "og:title", content: manual.title },
  { property: "og:description", content: manual.subtitle },
];

export default function Manual({ loaderData }: Route.ComponentProps) {
  return <ManualPage {...loaderData} />;
}
