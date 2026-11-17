import {
  CARRERAS,
  type Carrera,
  COLECCIONES,
  type ColeccionId,
  HERRAMIENTAS,
  type Herramienta,
} from "../catalog/catalog";

/** What la Pila needs of a Manual to filter it: a Manual itself, or the book data the home page ships. */
export interface Filterable {
  title: string;
  coleccion: ColeccionId;
  carrera?: Carrera;
  herramientas: readonly Herramienta[];
}

/** The search and filters, parsed from the URL. A missing or invalid param is no filter. */
export interface PilaFilter {
  query: string;
  coleccion: ColeccionId | undefined;
  carrera: Carrera | undefined;
  herramienta: Herramienta | undefined;
}

function oneOf<T extends string>(
  value: string | null,
  options: readonly T[],
): T | undefined {
  // Trust boundary: a URL param is only a T once it is one of the options.
  return options.find((option) => option === value);
}

// Trust boundary: a URL param is only a Carrera once CARRERAS has it.
function parseCarrera(value: string | null): Carrera | undefined {
  return value !== null && Object.hasOwn(CARRERAS, value)
    ? (value as Carrera)
    : undefined;
}

export function parseFilter(params: URLSearchParams): PilaFilter {
  return {
    query: params.get("q") ?? "",
    coleccion: oneOf(
      params.get("coleccion"),
      COLECCIONES.map(({ id }) => id),
    ),
    carrera: parseCarrera(params.get("carrera")),
    herramienta: oneOf(params.get("herramienta"), HERRAMIENTAS),
  };
}

/** Lower case, without accents, so "estadistica" finds "Estadística". */
const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** La Pila's books that match the URL's search and filters, in their original order. */
export function filterPila<T extends Filterable>(
  books: readonly T[],
  params: URLSearchParams,
): T[] {
  const { query, coleccion, carrera, herramienta } = parseFilter(params);
  const words = fold(query).split(/\s+/).filter(Boolean);
  return books.filter(
    (book) =>
      words.every((word) => fold(book.title).includes(word)) &&
      (!coleccion || book.coleccion === coleccion) &&
      (!carrera || book.carrera === carrera) &&
      (!herramienta || book.herramientas.includes(herramienta)),
  );
}
