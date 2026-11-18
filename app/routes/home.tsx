import { renderToStaticMarkup } from "react-dom/server";
import { useSearchParams } from "react-router";

import {
  CARRERAS,
  coleccionName,
  findManual,
  MANUALES,
  manualPath,
  recorridoStep,
} from "../catalog/catalog";
import { Estante } from "../layout-prototype/estante";
import { Pliego } from "../layout-prototype/pliego";
import { Switcher } from "../layout-prototype/switcher";
import { VariantA } from "../layout-prototype/variant-a";
import { Motif } from "../tapa/motifs";
import {
  Lomo,
  lomoThickness,
  Tapa,
  tapaColors,
  tapaDesign,
} from "../tapa/tapa";
import type { Route } from "./+types/home";

// PROTOTYPE: the motif drawn large, its strokes normalised to length 1 so CSS can draw them in.
function motifMarkup(manual: (typeof MANUALES)[number], color: string) {
  const svg = renderToStaticMarkup(
    <svg viewBox="-4 -4 218 128" className="block size-full overflow-visible">
      <Motif
        kind={tapaDesign(manual).motif}
        ink={{ stroke: color, fill: `${color}26` }}
      />
    </svg>,
  );
  return svg.replace(
    /<(path|line|polyline|polygon|circle|rect|ellipse)\b/g,
    '<$1 pathLength="1"',
  );
}

// Runs only at build time (ADR 0002): the catalog and the Tapa code stay out of the browser bundle.
export function loader() {
  return {
    // MANUALES is already in catalog order: Colección, then Recorrido step; Estadística aplicada by Campo, then Carrera.
    books: MANUALES.map((manual) => {
      const color = tapaColors(manual).background;
      const position =
        MANUALES.filter((m) => m.coleccion === manual.coleccion).indexOf(
          manual,
        ) + 1;
      const twin = manual.par ? findManual(manual.par) : undefined;
      return {
        path: manualPath(manual),
        title: manual.title,
        color,
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
        // PROTOTYPE (Pliego): the spread's fields.
        slug: manual.slug,
        subtitle: manual.subtitle,
        coleccionName: coleccionName(manual.coleccion),
        number: String(
          manual.coleccion === "estadistica-aplicada"
            ? position
            : (recorridoStep(manual) ?? position),
        ).padStart(2, "0"),
        pages: manual.pages,
        contents: [...manual.contents],
        twin: twin ? twin.herramientas.join(" · ") : null,
        tapa: renderToStaticMarkup(
          <Tapa manual={manual} className="block size-full" />,
        ),
        motif: motifMarkup(manual, color),
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

// PROTOTYPE: el Pliego by default; `?variant=estante` the one-shelf Estante, `?variant=pila` la Pila as picked on #30.
export default function Home({ loaderData }: Route.ComponentProps) {
  const [params] = useSearchParams();
  const variant = params.get("variant");
  return (
    <>
      {variant === "pila" ? (
        <VariantA books={loaderData.books} />
      ) : variant === "estante" ? (
        <Estante books={loaderData.books} />
      ) : (
        <Pliego books={loaderData.books} />
      )}
      <Switcher />
    </>
  );
}
