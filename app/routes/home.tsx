import { renderToStaticMarkup } from "react-dom/server";

import { MANUALES, manualPath } from "../catalog/catalog";
import { VariantA } from "../layout-prototype/variant-a";
import { Lomo, tapaColors } from "../tapa/tapa";
import type { Route } from "./+types/home";

// Runs only at build time (ADR 0002): the catalog and the Tapa code stay out of the browser bundle.
export function loader() {
  return {
    // MANUALES is already in catalog order: Colección, then Recorrido step; Estadística aplicada by Campo, then Carrera.
    books: MANUALES.map((manual) => ({
      path: manualPath(manual),
      title: manual.title,
      color: tapaColors(manual).background,
      lomo: renderToStaticMarkup(
        <Lomo manual={manual} className="block w-full" />,
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

// PROTOTYPE (#30): the picked variant.
export default function Home({ loaderData }: Route.ComponentProps) {
  return <VariantA books={loaderData.books} />;
}
