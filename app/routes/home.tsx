import { renderToStaticMarkup } from "react-dom/server";

import {
  coleccionName,
  coleccionNumber,
  MANUALES,
  manualPath,
} from "../catalog/catalog";
import { Helice } from "../helice/helice";
import { Loader } from "../loader/loader";
import { Header } from "../shared/header";
import { Tapa, tapaColors } from "../tapa/tapa";
import type { Route } from "./+types/home";

// Runs only at build time (ADR 0002): the catalog and the Tapa code stay out of the browser bundle.
export function loader() {
  return {
    // MANUALES is already in catalog order: Colección, then Recorrido step; Estadística aplicada by Campo, then Carrera.
    books: MANUALES.map((manual) => {
      const number = coleccionNumber(manual);
      return {
        path: manualPath(manual),
        title: manual.title,
        tapa: renderToStaticMarkup(
          <Tapa manual={manual} className="block h-auto w-full shadow-tapa" />,
        ),
        number: String(number).padStart(2, "0"),
        coleccion: coleccionName(manual.coleccion),
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
    <>
      {/* First, so its script flags a first visit before anything else is parsed. */}
      <Loader />
      <Header className="fixed top-0 left-0 z-10 px-4 pt-3 lg:px-16 lg:pt-8" />
      <main>
        <h1 className="sr-only">Manuales</h1>
        <Helice books={loaderData.books} />
        {/* The license, once, at the end of the track (spec #41, decision 3). Its own snap point lets the page rest
            here past the last step. */}
        <p className="mx-auto max-w-xl snap-end px-4 pb-6 text-center text-sm text-pretty text-ink-muted wide:pb-16">
          Todos los Manuales son gratuitos, con licencia CC BY-NC-SA 4.0. © Raúl
          E. Paz Zanini.
        </p>
      </main>
    </>
  );
}
