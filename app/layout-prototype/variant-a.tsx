// PROTOTYPE (#30), never merged. Variant A "Regla": the menu is a ruler of every Manual that scrubs with la Pila.
import { Link } from "react-router";

import { Pila } from "../pila/pila";
import {
  ABOUT,
  focusBook,
  LICENSE,
  type ProtoBook,
  rows,
  useFocus,
} from "./shared";

export function VariantA({ books }: { books: ProtoBook[] }) {
  const index = useFocus();
  const book = books[index] ?? books[0];
  return (
    <>
      <main className="mx-auto w-full px-6 pt-20 pb-32 lg:max-w-[min(56rem,calc(100vw-40rem))] lg:px-0 lg:pt-[12svh]">
        <h1 className="sr-only">Manuales de Raúl E. Paz Zanini</h1>
        <Pila books={books} />
      </main>

      {/* Left: wordmark, then the book in focus */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-10 flex items-center justify-between bg-paper/85 px-6 py-3 backdrop-blur lg:inset-x-auto lg:top-8 lg:left-8 lg:block lg:w-72 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <Link
          to="/"
          className="pointer-events-auto font-serif text-lg font-semibold tracking-tight lg:text-2xl"
        >
          Raúl E. Paz Zanini
        </Link>
        <Link to={ABOUT} className="pointer-events-auto text-sm lg:hidden">
          Archivo
        </Link>
        {book && (
          <div key={index} aria-live="polite" className="mt-12 hidden lg:block">
            <p className="font-serif text-3xl leading-tight font-semibold text-balance">
              <span className="proto-fade block">{book.title}</span>
            </p>
            <dl className="mt-5">
              {rows(book).map(([label, value], i) => (
                <div
                  key={label}
                  className="relative flex items-baseline justify-between gap-4 py-2"
                >
                  <span
                    className="proto-draw absolute inset-x-0 top-0 h-px bg-ink"
                    style={{ animationDelay: `${i * 90}ms` }}
                  />
                  <dt className="text-[0.65rem] tracking-[0.18em] text-ink-muted uppercase">
                    {label}
                  </dt>
                  <dd className="overflow-hidden text-right text-sm">
                    <span
                      className="proto-rise block"
                      style={{ animationDelay: `${120 + i * 90}ms` }}
                    >
                      {value}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>

      {/* Phone: the book in focus as a caption */}
      {book && (
        <div className="fixed inset-x-0 bottom-0 z-10 bg-paper/90 px-6 pt-3 pb-16 backdrop-blur lg:hidden">
          <p
            key={index}
            className="proto-fade font-serif text-lg leading-tight font-semibold"
          >
            {book.title}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {rows(book)
              .map(([, v]) => v)
              .join(" · ")}
          </p>
        </div>
      )}

      {/* Right: nav, the ruler, and the footer */}
      <nav
        aria-label="Menú"
        className="pointer-events-none fixed top-1/2 right-0 z-10 -translate-y-1/2 lg:top-8 lg:right-8 lg:bottom-8 lg:flex lg:w-72 lg:translate-y-0 lg:flex-col lg:items-end"
      >
        <ul className="hidden gap-6 text-sm lg:flex">
          <li>
            <Link
              to="/"
              className="pointer-events-auto relative after:absolute after:-bottom-2 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-ink"
            >
              La Pila
            </Link>
          </li>
          <li>
            <Link
              to={ABOUT}
              className="pointer-events-auto text-ink-muted hover:text-ink"
            >
              Sobre el archivo
            </Link>
          </li>
        </ul>

        <ol
          aria-label="Índice"
          className="pointer-events-auto relative w-5 [--pitch:1rem] lg:my-auto lg:w-full lg:[--pitch:1.25rem]"
        >
          {/* The marker rides the scroll position continuously, between ticks */}
          <span
            aria-hidden
            className="absolute right-0 size-1.5 -translate-y-1/2 rounded-full bg-ink lg:-right-3"
            style={{
              top: `calc(var(--pila-at, 0) * var(--pitch) + var(--pitch) / 2)`,
            }}
          />
          {books.map((b, i) => {
            const active = i === index;
            return (
              <li key={b.path} style={{ height: "var(--pitch)" }}>
                <button
                  type="button"
                  aria-label={b.title}
                  aria-current={active || undefined}
                  onClick={() => {
                    focusBook(i);
                  }}
                  className="group/tick flex h-full w-full items-center justify-end gap-3 pr-2.5 lg:pr-0"
                >
                  <span
                    className={`hidden truncate text-xs transition-all duration-300 lg:block ${
                      active
                        ? "translate-x-0 opacity-100"
                        : "translate-x-2 opacity-0 group-hover/tick:translate-x-0 group-hover/tick:opacity-60 group-focus-visible/tick:opacity-60"
                    }`}
                  >
                    {b.title}
                  </span>
                  <span
                    className={`h-0.5 shrink-0 transition-[width] duration-500 ease-[cubic-bezier(.34,1.56,.64,1)] ${
                      active
                        ? "w-4 lg:w-14"
                        : "w-2 group-hover/tick:w-3 lg:w-5 lg:group-hover/tick:w-9"
                    }`}
                    style={{ backgroundColor: b.color }}
                  />
                </button>
              </li>
            );
          })}
        </ol>

        <footer className="hidden max-w-60 text-right text-xs text-ink-muted lg:block">
          <p>{LICENSE}</p>
          <p className="mt-1">© Raúl E. Paz Zanini</p>
        </footer>
      </nav>
    </>
  );
}
