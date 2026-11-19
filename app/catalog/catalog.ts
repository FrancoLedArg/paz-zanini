import { MANUALES } from "./manuales";

export { MANUALES };

export type Herramienta = "R" | "Python" | "Excel";

export type Campo = "Salud" | "Tecnología" | "Ciencias Sociales";

export const CARRERAS = {
  Obstetricia: "Salud",
  Kinesiología: "Salud",
  Fonoaudiología: "Salud",
  Informática: "Tecnología",
  Periodismo: "Ciencias Sociales",
  Sociología: "Ciencias Sociales",
  "Trabajo Social": "Ciencias Sociales",
} as const satisfies Record<string, Campo>;

export type Carrera = keyof typeof CARRERAS;

const COLECCIONES = [
  { id: "estadistica-desde-cero", name: "Estadística desde cero" },
  { id: "ciencia-de-datos-desde-cero", name: "Ciencia de datos desde cero" },
  { id: "estadistica-aplicada", name: "Estadística aplicada" },
] as const;

export type ColeccionId = (typeof COLECCIONES)[number]["id"];

/** The Colecciones that have a Recorrido. */
export type ColeccionDesdeCero = Exclude<ColeccionId, "estadistica-aplicada">;

/** The Colecciones that have a Recorrido, in catalog order. */
export const COLECCIONES_DESDE_CERO = COLECCIONES.flatMap(({ id }) =>
  id === "estadistica-aplicada" ? [] : [id],
);

interface ManualBase {
  /** The PDF's file name, also the Manual's URL segment. */
  slug: string;
  title: string;
  subtitle: string;
  pages: number;
  /** Empty when the Manual teaches without software. */
  herramientas: readonly Herramienta[];
  /** Top-level units, as printed in the Manual's índice. */
  contents: readonly string[];
  /** Slug of the other-language twin. */
  par?: string;
}

export type Manual =
  | (ManualBase & { coleccion: ColeccionDesdeCero })
  | (ManualBase & { coleccion: "estadistica-aplicada"; carrera: Carrera });

/** A Manual's permanent page URL; it never changes once published. */
export function manualPath(manual: Manual): string {
  return `/manuales/${manual.slug}`;
}

export function pdfPath(manual: Manual): string {
  return `/manuales/${manual.slug}.pdf`;
}

/** The Manuales of one Colección, in catalog order. */
export function manualesIn(coleccion: ColeccionId): Manual[] {
  return MANUALES.filter((manual) => manual.coleccion === coleccion);
}

/** Every Colección in catalog order, with how many Manuales it holds. */
export function coleccionesWithCount() {
  return COLECCIONES.map(({ id, name }) => ({
    id,
    name,
    count: manualesIn(id).length,
  }));
}

export function coleccionName(coleccion: ColeccionId): string {
  return COLECCIONES.find(({ id }) => id === coleccion)?.name ?? "";
}

export function findManual(slug: string): Manual | undefined {
  return MANUALES.find((manual) => manual.slug === slug);
}

/** A Manual's 1-based step in its Recorrido; Estadística aplicada has none. */
export function recorridoStep(manual: Manual): number | undefined {
  if (manual.coleccion === "estadistica-aplicada") return undefined;
  const index = recorrido(manual.coleccion).findIndex((step) =>
    step.some((other) => other.slug === manual.slug),
  );
  return index + 1;
}

/** A Manual's number in its Colección: its Recorrido step, or, in Estadística aplicada, its place in catalog order. */
export function coleccionNumber(manual: Manual): number {
  return (
    recorridoStep(manual) ?? manualesIn(manual.coleccion).indexOf(manual) + 1
  );
}

/** The Recorrido of a Colección, step by step; a Par shares one step. */
export function recorrido(coleccion: ColeccionDesdeCero): Manual[][] {
  const steps: Manual[][] = [];
  for (const manual of MANUALES) {
    if (manual.coleccion !== coleccion) continue;
    const twinStep = steps.find((step) =>
      step.some((other) => other.slug === manual.par),
    );
    if (twinStep) twinStep.push(manual);
    else steps.push([manual]);
  }
  return steps;
}
