import { renderToStaticMarkup } from "react-dom/server";
import { data, type ShouldRevalidateFunctionArgs } from "react-router";

import {
  coleccionesWithCount,
  coleccionNumber,
  manualesIn,
  manualPath,
} from "../catalog/catalog";
import { Helice } from "../helice/helice";
import { Loader } from "../loader/loader";
import { Header } from "../shared/header";
import { Tapa, tapaColors } from "../tapa/tapa";
import type { Route } from "./+types/colecciones";

// The layout of every Colección's page: `/` for the first, `/colecciones/<id>` for the others (routes/coleccion.tsx
// only gives the URLs). Being one layout, the Hélice and its 3D canvas stay mounted across them.

// Runs only at build time (ADR 0002): the catalog and the Tapa code stay out of the browser bundle.
export function loader({ params }: Route.LoaderArgs) {
  // One URL per Colección: the first answers at `/` only.
  const path = params.id === undefined ? "/" : `/colecciones/${params.id}`;
  const coleccion = coleccionesWithCount().find(
    (candidate) => candidate.path === path,
  );
  // eslint-disable-next-line @typescript-eslint/only-throw-error -- React Router renders a thrown 404 in the ErrorBoundary.
  if (!coleccion) throw data(null, { status: 404 });

  return {
    coleccion,
    // Catalog order: the Recorrido step; Estadística aplicada by Campo, then Carrera.
    books: manualesIn(coleccion.id).map((manual) => {
      const number = coleccionNumber(manual);
      return {
        path: manualPath(manual),
        title: manual.title,
        tapa: renderToStaticMarkup(
          <Tapa manual={manual} className="block h-auto w-full shadow-tapa" />,
        ),
        number: String(number).padStart(2, "0"),
        color: tapaColors(manual).background,
        details: [
          manual.coleccion === "estadistica-aplicada"
            ? manual.carrera
            : `Paso ${number}`,
          manual.herramientas.join(" y ") || "Sin software",
          `${manual.pages} páginas`,
        ].join(" · "),
      };
    }),
  };
}

// By default a layout's loader reruns only when its own path changes, and this one's is `/` on every Colección's page.
export function shouldRevalidate({
  currentParams,
  nextParams,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
  return currentParams.id !== nextParams.id || defaultShouldRevalidate;
}

// The child routes export no meta of their own, so this one names each Colección's page.
export const meta: Route.MetaFunction = ({ loaderData: { coleccion } }) => [
  { title: `${coleccion.name} · Raúl E. Paz Zanini` },
  {
    name: "description",
    content: `${coleccion.name}: ${coleccion.count} Manuales gratuitos de Raúl E. Paz Zanini.`,
  },
];

export default function Colecciones({ loaderData }: Route.ComponentProps) {
  const { coleccion, books } = loaderData;
  return (
    <>
      {/* First, so its script flags a first visit before anything else is parsed. */}
      <Loader />
      {/* Taps between the logo and the menu reach the Hélice under them. */}
      <Header className="pointer-events-none fixed inset-x-0 top-0 z-10 px-4 pt-3 *:pointer-events-auto lg:px-16 lg:pt-8" />
      <main>
        <h1 className="sr-only">{coleccion.name}</h1>
        <Helice books={books} coleccion={coleccion} />
      </main>
    </>
  );
}
