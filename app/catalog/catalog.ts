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

export const COLECCIONES = [
  { id: "estadistica-desde-cero", name: "Estadística desde cero" },
  { id: "ciencia-de-datos-desde-cero", name: "Ciencia de datos desde cero" },
  { id: "estadistica-aplicada", name: "Estadística aplicada" },
] as const;

export type ColeccionId = (typeof COLECCIONES)[number]["id"];

/** The Colecciones that have a Recorrido. */
export type ColeccionDesdeCero = Exclude<ColeccionId, "estadistica-aplicada">;

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

export function findManual(slug: string): Manual | undefined {
  return MANUALES.find((manual) => manual.slug === slug);
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
