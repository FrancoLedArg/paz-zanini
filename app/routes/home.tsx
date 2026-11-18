import { renderToStaticMarkup } from "react-dom/server";
import { useSearchParams } from "react-router";

import {
  CARRERAS,
  MANUALES,
  manualPath,
  recorridoStep,
} from "../catalog/catalog";
import { Estante } from "../layout-prototype/estante";
import { VariantA } from "../layout-prototype/variant-a";
import { Lomo, lomoThickness, tapaColors } from "../tapa/tapa";
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
      // PROTOTYPE (Estante): the shelf's extra fields.
      coleccion: manual.coleccion,
      mark:
        manual.coleccion === "estadistica-aplicada"
          ? `${manual.carrera} · ${CARRERAS[manual.carrera]}`
          : `Paso ${String(recorridoStep(manual)).padStart(2, "0")}`,
      herramientas: manual.herramientas.join(" · "),
      thickness: lomoThickness(manual),
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

// PROTOTYPE: el Estante by default; `?variant=pila` shows la Pila as picked on #30, for comparison.
export default function Home({ loaderData }: Route.ComponentProps) {
  const [params] = useSearchParams();
  return params.get("variant") === "pila" ? (
    <VariantA books={loaderData.books} />
  ) : (
    <Estante books={loaderData.books} />
  );
}
