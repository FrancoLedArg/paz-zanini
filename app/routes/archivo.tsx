import {
  type ColeccionDesdeCero,
  coleccionName,
  type Manual,
  MANUALES,
  manualPath,
  recorrido,
} from "../catalog/catalog";
import { InfoPage, LinkList } from "../info/info";
import { LICENSE_URL } from "../shared/license";
import type { Route } from "./+types/archivo";

// Runs only at build time (ADR 0002): the catalog stays out of the browser bundle.
export function loader() {
  const link = (manual: Manual) => ({
    path: manualPath(manual),
    title: manual.title,
  });
  return {
    count: MANUALES.length,
    recorridos: (
      [
        "estadistica-desde-cero",
        "ciencia-de-datos-desde-cero",
      ] satisfies ColeccionDesdeCero[]
    ).map((coleccion) => ({
      label: coleccionName(coleccion),
      // A Par shares the first step, so it may hold two Manuales.
      links: (recorrido(coleccion)[0] ?? []).map(link),
    })),
    carreras: MANUALES.flatMap((manual) =>
      manual.coleccion === "estadistica-aplicada"
        ? [{ label: manual.carrera, links: [link(manual)] }]
        : [],
    ),
  };
}

export const meta: Route.MetaFunction = () => [
  { title: "Sobre el archivo · Raúl E. Paz Zanini" },
  {
    name: "description",
    content:
      "Qué es el archivo de Manuales gratuitos de Raúl E. Paz Zanini, qué te permite su licencia y por dónde empezar.",
  },
];

export default function Archivo({ loaderData }: Route.ComponentProps) {
  const { count, recorridos, carreras } = loaderData;
  return (
    <InfoPage title="Sobre el archivo">
      {/* PLACEHOLDER copy, until the Autor's own text arrives (spec #57, a later ticket). The links stay. */}
      <p>
        Este archivo reúne los {count} Manuales de estadística y ciencia de
        datos de Raúl E. Paz Zanini, ordenados en tres Colecciones. Todos son
        gratuitos.
      </p>

      <h2>La licencia</h2>
      <p>
        Todos los Manuales tienen licencia{" "}
        <a href={LICENSE_URL}>CC BY-NC-SA 4.0</a>. Podés descargarlos,
        compartirlos y adaptarlos, siempre que nombres al Autor, no los uses con
        fines comerciales y compartas lo que hagas con la misma licencia.
      </p>

      <h2>Por dónde empezar</h2>
      <p>
        Si recién empezás, seguí el Recorrido de una Colección desde cero, paso
        a paso. Empezá por acá:
      </p>
      <LinkList entries={recorridos} />
      <p>
        Si estudiás una carrera, empezá por el Manual de Estadística aplicada
        escrito para ella:
      </p>
      <LinkList entries={carreras} />
    </InfoPage>
  );
}
