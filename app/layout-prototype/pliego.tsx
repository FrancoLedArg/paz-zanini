// PROTOTYPE, never merged: el Pliego. One Manual per screen, the protagonist of that moment, in a native sideways
// pager (snap-stop: always, so a swipe moves exactly one). Around the 3D book: its motif drawn large, its number,
// title, subtitle and índice, and the room tinted by its Tapa. Variant A's Regla returns as the overview.
import {
  type CSSProperties,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link } from "react-router";

import { useHydrated } from "../shared/hydrated";
import "./pliego.css";

const PliegoView = lazy(() =>
  import("./pliego-scene").then(
    (module) => ({ default: module.PliegoView }),
    () => ({ default: () => null }),
  ),
);

export interface PliegoBook {
  path: string;
  slug: string;
  title: string;
  subtitle: string;
  color: string;
  coleccion: string;
  coleccionName: string;
  /** "Paso 03", or "Kinesiología · Salud". */
  mark: string;
  /** The big numeral: the Recorrido step, or the place in its Colección. */
  number: string;
  herramientas: string;
  pages: number;
  contents: string[];
  /** The other-language twin's Herramientas, for a Par. */
  twin: string | null;
  tapa: string;
  motif: string;
}

const ABOUT = "/acerca";

export function Pliego({ books }: { books: PliegoBook[] }) {
  const hydrated = useHydrated();
  const scroller = useRef<HTMLDivElement>(null);
  // Fractional position in the pager: 2.5 is halfway from the third Manual to the fourth.
  const [progress, setProgress] = useState(0);
  const active = Math.round(progress);
  const book = books[active] ?? books[0];

  const go = (index: number) => {
    const el = scroller.current;
    if (!el) return;
    const i = Math.min(Math.max(index, 0), books.length - 1);
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => {
      setProgress(el.scrollLeft / el.clientWidth);
    };
    // A mouse wheel steps one Manual per notch; a trackpad's sideways swipe stays native.
    let last = 0;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      const now = performance.now();
      if (now - last < 450 || Math.abs(event.deltaY) < 4) return;
      last = now;
      const current = Math.round(el.scrollLeft / el.clientWidth);
      el.scrollTo({
        left: (current + Math.sign(event.deltaY)) * el.clientWidth,
        behavior: "smooth",
      });
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const current = Math.round(el.scrollLeft / el.clientWidth);
      el.scrollTo({
        left:
          (current + (event.key === "ArrowRight" ? 1 : -1)) * el.clientWidth,
        behavior: "smooth",
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("wheel", onWheel);
      removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <main
      className="group relative h-svh overflow-hidden transition-[background-color] duration-700 ease-out"
      // The room takes the protagonist's colour.
      style={{
        backgroundColor: `color-mix(in oklch, ${book?.color ?? "transparent"} 9%, var(--color-paper))`,
      }}
    >
      <h1 className="sr-only">Manuales de Raúl E. Paz Zanini</h1>
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-3 lg:px-16 lg:pt-8">
        <Link
          to="/"
          className="pointer-events-auto font-serif text-lg font-semibold tracking-tight lg:text-2xl"
        >
          Raúl E. Paz Zanini
        </Link>
        <Link
          to={ABOUT}
          className="pointer-events-auto flex min-h-11 items-center text-sm"
        >
          <span className="lg:hidden">Archivo</span>
          <span className="hidden text-ink-muted hover:text-ink lg:inline">
            Sobre el archivo
          </span>
        </Link>
      </header>

      <div
        ref={scroller}
        className="flex h-full snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overflow-y-hidden overscroll-x-contain"
      >
        {hydrated && (
          <Suspense>
            {/* Sticky inside the pager and blind to the pointer, so a swipe over the book still pages natively. */}
            <PliegoView
              scroller={scroller}
              className="pliego-3d pointer-events-none sticky left-0 z-5 -mr-[100vw] h-full w-screen shrink-0"
            />
          </Suspense>
        )}
        {books.map((b, i) => (
          <Spread key={b.slug} book={b} active={i === active} index={i} />
        ))}
      </div>

      <Regla books={books} progress={progress} onJump={go} />
    </main>
  );
}

interface SpreadProps {
  book: PliegoBook;
  active: boolean;
  index: number;
}

function Spread({ book, active, index }: SpreadProps) {
  const rise = (step: number) =>
    ({ "--d": `${120 + step * 70}ms` }) as CSSProperties;
  return (
    <section
      aria-label={book.title}
      data-active={active}
      className="pliego-spread relative h-full w-screen shrink-0 snap-center snap-always"
      style={{ "--ink": book.color } as CSSProperties}
    >
      {/* The motif, huge, drawing itself in the Tapa's colour. */}
      <div
        aria-hidden="true"
        className="pliego-motif absolute top-[6svh] left-1/2 w-[170vw] -translate-x-1/2 opacity-20 lg:top-1/2 lg:w-[84vw] lg:-translate-y-[55%] lg:opacity-[0.16]"
        dangerouslySetInnerHTML={{ __html: book.motif }}
      />

      {/* Where the 3D book stands; until it arrives (and under reduced motion) the flat Tapa shows here. */}
      <Link
        to={book.path}
        tabIndex={-1}
        aria-hidden="true"
        data-book={index}
        className="absolute top-[13svh] left-1/2 aspect-[213/303] h-[40svh] -translate-x-1/2 lg:top-1/2 lg:h-[60svh] lg:-translate-y-[54%]"
      >
        <span
          className="block size-full shadow-tapa group-has-[.pliego-3d[aria-busy=false]]:opacity-0 motion-safe:transition-opacity"
          dangerouslySetInnerHTML={{ __html: book.tapa }}
        />
      </Link>

      {/* Phone: the words under the book. Desktop: the left column. */}
      <div className="absolute inset-x-4 bottom-24 lg:top-1/2 lg:right-auto lg:bottom-auto lg:left-16 lg:w-[26vw] lg:max-w-[30rem] lg:-translate-y-1/2">
        <div className="pliego-rise flex items-baseline gap-3" style={rise(0)}>
          <span
            className="font-serif text-5xl leading-none font-light lg:text-[9rem]"
            style={{ color: book.color }}
          >
            {book.number}
          </span>
          <span className="text-[0.625rem] tracking-widest text-ink-muted uppercase lg:hidden">
            {book.coleccionName}
          </span>
        </div>
        <h2
          className="pliego-rise mt-2 font-serif text-[1.75rem] leading-[1.05] font-semibold text-balance lg:mt-4 lg:text-5xl"
          style={rise(1)}
        >
          <Link to={book.path} className="hover:underline">
            {book.title}
          </Link>
        </h2>
        <p
          className="pliego-rise mt-2 line-clamp-2 text-sm text-ink-muted lg:mt-4 lg:line-clamp-none lg:text-base"
          style={rise(2)}
        >
          {book.subtitle}
        </p>
        <dl
          className="pliego-rise mt-3 grid grid-cols-[auto_1fr] text-xs lg:mt-8"
          style={rise(3)}
        >
          {(
            [
              ["Colección", book.coleccionName, "hidden lg:grid"],
              [
                book.coleccion === "estadistica-aplicada"
                  ? "Carrera"
                  : "Recorrido",
                book.mark,
                "hidden lg:grid",
              ],
              [
                "Herramientas",
                book.twin
                  ? `${book.herramientas} · también en ${book.twin}`
                  : book.herramientas || "—",
                "grid",
              ],
              ["Páginas", String(book.pages), "grid"],
            ] as const
          ).map(([label, value, display]) => (
            <div
              key={label}
              className={`col-span-2 ${display} grid-cols-subgrid border-t py-1.5`}
              style={{
                borderColor: `color-mix(in oklch, ${book.color} 25%, transparent)`,
              }}
            >
              <dt className="text-[0.625rem] tracking-widest text-ink-muted uppercase">
                {label}
              </dt>
              <dd className="text-right">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Desktop: the índice, what's inside. */}
      <div className="absolute top-1/2 right-16 hidden w-[20vw] max-w-72 -translate-y-1/2 lg:block">
        <p
          className="pliego-rise text-[0.625rem] tracking-widest text-ink-muted uppercase"
          style={rise(2)}
        >
          Índice
        </p>
        <ol className="mt-3 text-sm">
          {book.contents.map((unit, i) => (
            <li
              key={unit}
              className="pliego-rise flex gap-3 border-t py-1.5"
              style={{
                ...rise(3 + i * 0.5),
                borderColor: `color-mix(in oklch, ${book.color} 20%, transparent)`,
              }}
            >
              <span
                className="w-5 shrink-0 tabular-nums"
                style={{ color: book.color }}
              >
                {i + 1}
              </span>
              <span>{unit}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

interface ReglaProps {
  books: PliegoBook[];
  progress: number;
  onJump: (index: number) => void;
}

/** One tick per Manual, grouped by Colección; a dot rides the position and the tick in focus stands tall. */
function Regla({ books, progress, onJump }: ReglaProps) {
  const groups: { name: string; first: number; count: number }[] = [];
  books.forEach((book, i) => {
    const group = groups.at(-1);
    if (group?.name === book.coleccionName) group.count++;
    else groups.push({ name: book.coleccionName, first: i, count: 1 });
  });
  const active = Math.round(progress);
  return (
    <nav
      aria-label="Manuales"
      className="absolute inset-x-4 bottom-3 z-20 lg:inset-x-16 lg:bottom-8"
    >
      <div className="relative flex gap-2 lg:gap-4">
        {groups.map((group) => (
          <div
            key={group.name}
            className="flex min-w-0 flex-col"
            style={{ flexGrow: group.count, flexBasis: 0 }}
          >
            <button
              type="button"
              onClick={() => {
                onJump(group.first);
              }}
              className="truncate text-left text-[0.625rem] tracking-widest text-ink-muted uppercase hover:text-ink"
            >
              {group.name}
            </button>
            <div className="flex">
              {books
                .slice(group.first, group.first + group.count)
                .map((book, j) => {
                  const i = group.first + j;
                  return (
                    <button
                      key={book.slug}
                      type="button"
                      aria-label={book.title}
                      aria-current={i === active ? "true" : undefined}
                      onClick={() => {
                        onJump(i);
                      }}
                      className="flex h-11 flex-1 items-end justify-center"
                    >
                      <span
                        className="w-0.5 rounded-full transition-all duration-300"
                        style={{
                          height: i === active ? 28 : 10,
                          backgroundColor: book.color,
                          opacity: i === active ? 1 : 0.45,
                        }}
                      />
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}
