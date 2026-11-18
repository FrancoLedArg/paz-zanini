// PROTOTYPE (after #30), never merged: el Estante. One shelf per Colección (A24's Films / Television), books upright
// spine-out in a native horizontal scroller with snap; the 3D shelf follows it and turns the book in focus face-out.
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";

import { COLECCIONES, type ColeccionId } from "../catalog/catalog";
import { useHydrated } from "../shared/hydrated";

const EstanteView = lazy(() =>
  import("./estante-scene").then(
    (module) => ({ default: module.EstanteView }),
    () => ({ default: () => null }),
  ),
);

export interface EstanteBook {
  path: string;
  title: string;
  lomo: string;
  color: string;
  coleccion: ColeccionId;
  /** "Paso 02", or the Carrera. */
  mark: string;
  herramientas: string;
  /** Lomo thickness in mm. */
  thickness: number;
}

const SHORT: Record<ColeccionId, string> = {
  "estadistica-desde-cero": "Estadística",
  "ciencia-de-datos-desde-cero": "Ciencia de datos",
  "estadistica-aplicada": "Aplicada",
};
const ABOUT = "/acerca";

function useColeccion(): ColeccionId {
  const [params] = useSearchParams();
  const value = params.get("coleccion");
  return COLECCIONES.find(({ id }) => id === value)?.id ?? COLECCIONES[0].id;
}

export function Estante({ books }: { books: EstanteBook[] }) {
  const coleccion = useColeccion();
  const shelf = books.filter((book) => book.coleccion === coleccion);
  return (
    <main className="flex h-svh flex-col overflow-hidden">
      <h1 className="sr-only">Manuales de Raúl E. Paz Zanini</h1>
      <header className="z-10 flex items-center justify-between px-4 pt-3 lg:absolute lg:inset-x-8 lg:top-8 lg:p-0">
        <Link
          to="/"
          className="font-serif text-lg font-semibold tracking-tight lg:text-2xl"
        >
          Raúl E. Paz Zanini
        </Link>
        <nav aria-label="Colecciones" className="hidden lg:block">
          <Tabs coleccion={coleccion} />
        </nav>
        <Link
          to={ABOUT}
          className="flex min-h-11 items-center text-sm lg:text-ink-muted"
        >
          <span className="lg:hidden">Archivo</span>
          <span className="hidden lg:inline">Sobre el archivo</span>
        </Link>
      </header>
      <nav aria-label="Colecciones" className="px-4 lg:hidden">
        <Tabs coleccion={coleccion} short />
      </nav>
      {/* Keyed: a new Colección starts at its first book, with its own scene. */}
      <Shelf key={coleccion} coleccion={coleccion} books={shelf} />
      <p className="absolute right-8 bottom-8 hidden max-w-60 text-right text-xs text-ink-muted lg:block">
        Todos los Manuales son gratuitos, con licencia CC BY-NC-SA 4.0.
        <br />© Raúl E. Paz Zanini
      </p>
    </main>
  );
}

function Tabs({
  coleccion,
  short = false,
}: {
  coleccion: ColeccionId;
  short?: boolean;
}) {
  return (
    <ul className="flex justify-between gap-6 text-sm lg:justify-start">
      {COLECCIONES.map(({ id, name }) => (
        <li key={id}>
          <Link
            to={`?coleccion=${id}`}
            replace
            preventScrollReset
            aria-current={id === coleccion ? "page" : undefined}
            className="relative flex min-h-11 items-center text-ink-muted hover:text-ink aria-[current]:text-ink aria-[current]:after:absolute aria-[current]:after:bottom-1 aria-[current]:after:left-1/2 aria-[current]:after:size-1 aria-[current]:after:-translate-x-1/2 aria-[current]:after:rounded-full aria-[current]:after:bg-ink"
          >
            {short ? SHORT[id] : name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Shelf({
  coleccion,
  books,
}: {
  coleccion: ColeccionId;
  books: EstanteBook[];
}) {
  const hydrated = useHydrated();
  const scroller = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const [focus, setFocus] = useState(0);
  const focusRef = useRef(0);

  useEffect(() => {
    const el = scroller.current;
    const ol = list.current;
    if (!el || !ol) return;
    const nearest = () => {
      const mid = el.getBoundingClientRect().left + el.clientWidth / 2;
      let best = 0;
      let bestDistance = Infinity;
      Array.from(ol.children).forEach((item, i) => {
        const rect = item.getBoundingClientRect();
        const distance = Math.abs(rect.left + rect.width / 2 - mid);
        if (distance < bestDistance) [best, bestDistance] = [i, distance];
      });
      return best;
    };
    const onScroll = () => {
      focusRef.current = nearest();
      setFocus(focusRef.current);
    };
    // A mouse wheel steps one book per notch, as A24 does; a trackpad's sideways swipe stays native.
    let last = 0;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      const now = performance.now();
      if (now - last < 320 || Math.abs(event.deltaY) < 4) return;
      last = now;
      const next = Math.min(
        Math.max(focusRef.current + Math.sign(event.deltaY), 0),
        ol.children.length - 1,
      );
      ol.children[next]?.scrollIntoView({
        inline: "center",
        block: "nearest",
        behavior: "smooth",
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  const book = books[focus];
  return (
    <>
      <div
        ref={scroller}
        // The spine: as tall as fits, but short enough that a face-out cover leaves the neighbours' spines in view.
        className="group relative flex min-h-0 flex-1 snap-x snap-mandatory [scrollbar-width:none] items-center overflow-x-auto overflow-y-hidden overscroll-x-contain [--spine:min(99vw,55svh)] lg:[--spine:min(99vw,48svh)]"
      >
        {hydrated && (
          <Suspense>
            {/* Sticky, inside the scroller, so a swipe over the 3D still scrolls the shelf natively. */}
            <EstanteView
              coleccion={coleccion}
              list={list}
              className="estante-3d sticky left-0 z-5 -mr-[100%] w-full shrink-0 self-stretch"
            />
          </Suspense>
        )}
        <ol
          ref={list}
          aria-label="El Estante"
          className="flex shrink-0 items-end px-[50%]"
        >
          {books.map(({ path, title, lomo, color, thickness }) => (
            <li
              key={path}
              className="shrink-0 snap-center"
              style={{
                width: `calc(var(--spine) * ${thickness} / 303)`,
                height: "var(--spine)",
              }}
            >
              <Link
                to={path}
                aria-label={title}
                style={{ backgroundColor: color }}
                className="relative block size-full overflow-hidden outline-offset-2 group-has-[.estante-3d[aria-busy=false]]:bg-transparent! focus-visible:ring-2 focus-visible:ring-paper focus-visible:outline-2 focus-visible:outline-ink"
              >
                {/* The Lomo is drawn lying down; turned a quarter clockwise it reads top to bottom, as the 3D one does. */}
                <span
                  aria-hidden="true"
                  className="absolute top-0 left-0 origin-top-left -translate-y-full rotate-90 group-has-[.estante-3d[aria-busy=false]]:opacity-0 [&>svg]:block [&>svg]:size-full"
                  style={{
                    width: "var(--spine)",
                    height: `calc(var(--spine) * ${thickness} / 303)`,
                  }}
                  dangerouslySetInnerHTML={{ __html: lomo }}
                />
              </Link>
            </li>
          ))}
        </ol>
      </div>

      {/* The book in focus: it changes one book at a time, so it can be read. */}
      <div
        aria-live="polite"
        className="px-4 pb-6 lg:absolute lg:bottom-8 lg:left-8 lg:w-72 lg:p-0"
      >
        {book && (
          <>
            <p className="font-serif text-xl leading-tight font-semibold lg:text-2xl">
              {book.title}
            </p>
            <dl className="mt-3 grid grid-cols-[auto_1fr] text-xs">
              {[
                [
                  "Colección",
                  COLECCIONES.find(({ id }) => id === coleccion)?.name,
                ],
                [
                  coleccion === "estadistica-aplicada"
                    ? "Carrera"
                    : "Recorrido",
                  book.mark,
                ],
                ["Herramientas", book.herramientas || "—"],
                ["Libro", `${focus + 1} de ${books.length}`],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="col-span-2 grid grid-cols-subgrid border-t border-rule py-1.5"
                >
                  <dt className="text-[0.625rem] tracking-widest text-ink-muted uppercase">
                    {label}
                  </dt>
                  <dd className="text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </div>
    </>
  );
}
