import { renderToStaticMarkup } from "react-dom/server";

import { MANUALES, manualPath } from "../catalog/catalog";
import { Helice } from "../helice/helice";
import { Tapa } from "../tapa/tapa";
import type { Route } from "./+types/home";

// Runs only at build time (ADR 0002): the catalog and the Tapa code stay out of the browser bundle.
export function loader() {
  return {
    // MANUALES is already in catalog order: Colección, then Recorrido step; Estadística aplicada by Campo, then Carrera.
    books: MANUALES.map((manual) => ({
      path: manualPath(manual),
      title: manual.title,
      // 40lvh wide is 56lvh tall, inside the track's 62lvh step; 72vw keeps it inside a phone's width.
      tapa: renderToStaticMarkup(
        <Tapa
          manual={manual}
          className="block h-auto w-[min(72vw,40lvh)] shadow-tapa"
        />,
      ),
    })),
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
    <main>
      <h1 className="sr-only">Manuales</h1>
      <Helice books={loaderData.books} />
      {/* The license, once, at the end of the track (spec #41, decision 3). */}
      <p className="mx-auto max-w-xl px-4 pb-16 text-center text-sm text-pretty text-ink-muted">
        Todos los Manuales son gratuitos, con licencia CC BY-NC-SA 4.0. © Raúl
        E. Paz Zanini.
      </p>
    </main>
  );
}
