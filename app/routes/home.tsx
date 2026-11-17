import { renderToStaticMarkup } from "react-dom/server";

import { MANUALES, manualPath } from "../catalog/catalog";
import { Pila } from "../pila/pila";
import { Lomo, tapaColors } from "../tapa/tapa";
import type { Route } from "./+types/home";

// Runs only at build time (ADR 0002): the catalog and the Tapa code stay out of the browser bundle.
export function loader() {
  return {
    // MANUALES is already in catalog order: Colección, then Recorrido step; Estadística aplicada by Campo, then Carrera.
    books: MANUALES.map((manual) => ({
      path: manualPath(manual),
      title: manual.title,
      coleccion: manual.coleccion,
      ...(manual.coleccion === "estadistica-aplicada" && {
        carrera: manual.carrera,
      }),
      herramientas: manual.herramientas,
      color: tapaColors(manual).background,
      lomo: renderToStaticMarkup(
        <Lomo manual={manual} className="block w-full" />,
      ),
    })),
  };
}

// The books never change, and the search lives in the URL: a search-param change must not refetch them.
export const shouldRevalidate = () => false;

export const meta: Route.MetaFunction = () => [
  { title: "Manuales · Raúl E. Paz Zanini" },
  {
    name: "description",
    content:
      "Manuales gratuitos de estadística y ciencia de datos de Raúl E. Paz Zanini.",
  },
];

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <main className="mx-auto max-w-xl px-4 pt-10 pb-20 sm:pt-16">
      <h1 className="font-serif text-3xl font-semibold sm:text-4xl">
        Manuales
      </h1>
      <p className="mt-3 text-pretty text-ink-muted">
        Manuales gratuitos de estadística y ciencia de datos, escritos por Raúl
        E. Paz Zanini. Todos con licencia CC BY-NC-SA 4.0: descargalos y
        compartilos.
      </p>
      <div className="mt-8">
        <Pila books={loaderData.books} />
      </div>
    </main>
  );
}
