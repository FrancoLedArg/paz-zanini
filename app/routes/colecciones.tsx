import { renderToStaticMarkup } from "react-dom/server";
import { data, type ShouldRevalidateFunctionArgs } from "react-router";

import {
  coleccionesWithCount,
  manualesIn,
  manualPath,
} from "../catalog/catalog";
import { Filters, Helice } from "../helice/helice";
import { Loader } from "../loader/loader";
import { Header } from "../shared/header";
import { Tapa } from "../tapa/tapa";
import type { Route } from "./+types/colecciones";

// The layout of every Colección's page: `/` for the first, `/colecciones/<id>` for the others (routes/coleccion.tsx
// only gives the URLs). Being one layout, the Hélice and its 3D canvas stay mounted across them.

// Runs only at build time (ADR 0002): the catalog and the Tapa code stay out of the browser bundle.
export function loader({ params }: Route.LoaderArgs) {
  // One URL per Colección: the first answers at `/` only.
  const path = params.id === undefined ? "/" : `/colecciones/${params.id}`;
  const colecciones = coleccionesWithCount();
  const coleccion = colecciones.find((candidate) => candidate.path === path);
  // eslint-disable-next-line @typescript-eslint/only-throw-error -- React Router renders a thrown 404 in the ErrorBoundary.
  if (!coleccion) throw data(null, { status: 404 });

  return {
    colecciones,
    coleccion,
    // Catalog order: the Recorrido step; Estadística aplicada by Campo, then Carrera.
    books: manualesIn(coleccion.id).map((manual) => ({
      path: manualPath(manual),
      title: manual.title,
      tapa: renderToStaticMarkup(
        <Tapa manual={manual} className="block h-auto w-full shadow-tapa" />,
      ),
    })),
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
  const { colecciones, coleccion, books } = loaderData;
  return (
    <>
      {/* First, so its script flags a first visit before anything else is parsed. */}
      <Loader />
      {/* Taps between the logo and the menu reach the Hélice under them. Tight margins, so the books carry the page. */}
      <Header className="pointer-events-none fixed inset-x-0 top-0 z-10 px-4 pt-1 *:pointer-events-auto lg:px-5" />
      <Filters colecciones={colecciones} />
      <main>
        <h1 className="sr-only">{coleccion.name}</h1>
        <Helice books={books} coleccion={coleccion.id} />
      </main>
    </>
  );
}
