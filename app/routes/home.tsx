import { renderToStaticMarkup } from "react-dom/server";

import {
  coleccionName,
  MANUALES,
  manualPath,
  recorridoStep,
} from "../catalog/catalog";
import "../layout-prototype/prototype.css";
import { Switcher, useVariant } from "../layout-prototype/switcher";
import { VariantA } from "../layout-prototype/variant-a";
import { VariantB } from "../layout-prototype/variant-b";
import { VariantC } from "../layout-prototype/variant-c";
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
      // PROTOTYPE (#30): the book-in-focus info.
      coleccionId: manual.coleccion,
      coleccion: coleccionName(manual.coleccion),
      step: recorridoStep(manual),
      carrera:
        manual.coleccion === "estadistica-aplicada"
          ? manual.carrera
          : undefined,
      herramientas: manual.herramientas.join(" · "),
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

// PROTOTYPE (#30): three first-view variants, switched by ?variant=A|B|C.
export default function Home({ loaderData }: Route.ComponentProps) {
  const variant = useVariant();
  const { books } = loaderData;
  return (
    <>
      {variant === "A" && <VariantA books={books} />}
      {variant === "B" && <VariantB books={books} />}
      {variant === "C" && <VariantC books={books} />}
      <Switcher />
    </>
  );
}
