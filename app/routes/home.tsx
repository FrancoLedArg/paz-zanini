import { renderToStaticMarkup } from "react-dom/server";

import {
  coleccionName,
  coleccionNumber,
  MANUALES,
  manualPath,
} from "../catalog/catalog";
import { Helice } from "../helice/helice";
import { Loader } from "../loader/loader";
// PROTOTYPE (#67): the layout with one Hélice per Colección.
import {
  Prototype,
  usePrototypeColeccion,
} from "../layout-prototype/prototype";
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
        coleccionId: manual.coleccion,
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
  // PROTOTYPE (#67): one Colección per page, Colección I by default; no "Todas".
  const coleccion = usePrototypeColeccion();
  const books = loaderData.books.filter(
    (book) => book.coleccionId === coleccion,
  );
  return (
    <>
      {/* First, so its script flags a first visit before anything else is parsed. */}
      <Loader />
      <Prototype books={books} coleccion={coleccion} />
      <main>
        <h1 className="sr-only">Manuales</h1>
        <Helice books={books} coleccion={coleccion} />
      </main>
    </>
  );
}
