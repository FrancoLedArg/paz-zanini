import { useState, useSyncExternalStore } from "react";
import {
  Link,
  NavigationType,
  useLocation,
  useNavigationType,
  useSearchParams,
} from "react-router";

import {
  CARRERAS,
  type Carrera,
  COLECCIONES,
  type ColeccionId,
  HERRAMIENTAS,
  type Herramienta,
} from "../catalog/catalog";
import { filterPila, parseFilter } from "./filter";

interface PilaBook {
  path: string;
  title: string;
  coleccion: ColeccionId;
  carrera?: Carrera;
  herramientas: readonly Herramienta[];
  /** The Lomo as SVG markup, drawn at build time so the Tapa code stays out of the browser bundle. */
  lomo: string;
  /** The Tapa's background colour. */
  color: string;
}

interface Props {
  /** Top to bottom, in catalog order. */
  books: PilaBook[];
}

const subscribe = () => () => undefined;

/** La Pila with its search and filter bar. The URL's search params hold the search, so it can be shared and undone. */
export function Pila({ books }: Props) {
  const [params, setParams] = useSearchParams();
  // The prerendered page has no search params: render it unfiltered while hydrating, then apply the URL's.
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const search = hydrated ? params : new URLSearchParams();
  const filter = parseFilter(search);
  const shown = filterPila(books, search);
  const filtering = shown.length !== books.length;

  // The search box keeps its own text, so the caret stays put while the URL catches up. It takes the URL's text
  // when that changes from outside: the first load (once hydrated), and back or forward.
  const location = useLocation();
  const navigationType = useNavigationType();
  const [query, setQuery] = useState("");
  const syncKey = hydrated ? location.key : "";
  const [syncedKey, setSyncedKey] = useState(syncKey);
  if (syncKey !== syncedKey) {
    setSyncedKey(syncKey);
    if (navigationType === NavigationType.Pop) setQuery(search.get("q") ?? "");
  }

  /** Typing replaces the history entry; choosing a filter adds one, so back undoes it. */
  const update = (key: string, value: string, replace: boolean) => {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace, preventScrollReset: true },
    );
  };

  return (
    <>
      <search className="sticky top-0 z-20 -mx-4 space-y-2 bg-paper/95 px-4 py-3 backdrop-blur">
        <label className="block">
          <span className="sr-only">Buscar un manual</span>
          <input
            type="search"
            placeholder="Buscar un manual"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              update("q", event.target.value, true);
            }}
            className="min-h-11 w-full rounded-full border border-rule bg-paper px-4 placeholder:text-ink-muted"
          />
        </label>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <Select
            label="Colección"
            value={filter.coleccion}
            options={COLECCIONES.map(({ id, name }) => ({
              value: id,
              label: name,
            }))}
            onChange={(value) => {
              update("coleccion", value, false);
            }}
          />
          <Select
            label="Carrera"
            value={filter.carrera}
            options={Object.keys(CARRERAS).map((carrera) => ({
              value: carrera,
              label: carrera,
            }))}
            onChange={(value) => {
              update("carrera", value, false);
            }}
          />
          <Select
            label="Herramienta"
            value={filter.herramienta}
            options={HERRAMIENTAS.map((herramienta) => ({
              value: herramienta,
              label: herramienta,
            }))}
            onChange={(value) => {
              update("herramienta", value, false);
            }}
          />
        </div>
        <p role="status" className="text-sm text-ink-muted empty:hidden">
          {filtering && `${shown.length} de ${books.length} manuales`}
        </p>
      </search>

      {shown.length > 0 ? (
        <FlatPila books={shown} />
      ) : (
        <div className="py-12 text-center">
          <p>No hay manuales que coincidan. Probá con otra palabra.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setParams({}, { preventScrollReset: true });
            }}
            className="mt-4 min-h-11 rounded-full border border-ink px-5 font-semibold"
          >
            Borrar búsqueda y filtros
          </button>
        </div>
      )}
    </>
  );
}

interface SelectProps {
  label: string;
  value: string | undefined;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

/** A filter: its empty option, named after the filter, means "all". */
function Select({ label, value, options, onChange }: SelectProps) {
  return (
    <label className="block min-w-0">
      <span className="sr-only">{label}</span>
      <select
        value={value ?? ""}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="min-h-11 w-full truncate rounded-full border border-rule bg-paper pr-1 pl-3"
      >
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

interface FlatPilaProps {
  books: PilaBook[];
}

/**
 * The flat Pila: every Manual as a book lying flat, its Lomo to the visitor, each a real link (ADR 0001).
 * It is the prerendered page, and what reduced motion and no-WebGL visitors keep.
 */
function FlatPila({ books }: FlatPilaProps) {
  return (
    <ol aria-label="La Pila" className="mt-4">
      {books.map(({ path, title, lomo, color }) => (
        <li key={path}>
          {/* A thin Lomo is shorter than a 44 px touch target: the link keeps the full height in the book's colour,
              so the stack stays unbroken and a thin book just reads a little thicker. */}
          <Link
            to={path}
            aria-label={title}
            style={{ backgroundColor: color }}
            // Two-tone focus ring, cream inside and dark outside, so it shows over a dark neighbour and over the paper alike.
            className="flex min-h-11 items-center outline-offset-2 focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-paper focus-visible:outline-2 focus-visible:outline-ink"
          >
            {/* Build-time SVG from our own catalog, never visitor input. Hidden: the link's name is the title alone. */}
            <span
              aria-hidden="true"
              className="w-full"
              dangerouslySetInnerHTML={{ __html: lomo }}
            />
          </Link>
        </li>
      ))}
    </ol>
  );
}
