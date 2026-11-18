// PROTOTYPE (#30), never merged. Variant C "Cintas": bookmark ribbons, one per Colección plus one for the archive,
// hang from the top right; the ribbon of the book in focus drops lower, and hovering one opens its list.
import { Link } from "react-router";

import { Pila } from "../pila/pila";
import {
  ABOUT,
  focusBook,
  groups,
  LICENSE,
  type ProtoBook,
  rows,
  useFocus,
} from "./shared";

const CREAM = "#fbf6ea";
const SPRING = "ease-[cubic-bezier(.34,1.56,.64,1)]";

export function VariantC({ books }: { books: ProtoBook[] }) {
  const index = useFocus();
  const book = books[index] ?? books[0];
  const current = book?.coleccionId;
  return (
    <>
      <main className="mx-auto w-full px-4 pt-56 pb-28 lg:max-w-[min(56rem,calc(100vw-40rem))] lg:px-0 lg:pt-[12svh]">
        <h1 className="sr-only">Manuales de Raúl E. Paz Zanini</h1>
        <Pila books={books} />
      </main>

      {/* Left: wordmark over a rule, then the book in focus, A24-style */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-10 bg-gradient-to-b from-paper from-75% to-transparent px-4 pt-4 pr-32 pb-16 lg:inset-x-auto lg:top-8 lg:left-8 lg:w-72 lg:bg-none lg:p-0">
        <Link
          to="/"
          className="pointer-events-auto block border-b border-ink pb-2 text-[0.7rem] font-semibold tracking-[0.28em] uppercase"
        >
          Raúl E. Paz Zanini
        </Link>
        {book && (
          <div key={index} aria-live="polite" className="mt-3 lg:mt-8">
            <p className="font-serif text-3xl leading-[0.95] font-semibold tracking-tight lg:text-4xl">
              {book.title.split(" ").map((word, i) => (
                <span
                  key={i}
                  className="inline-block overflow-hidden pb-1 align-bottom"
                >
                  <span
                    className="proto-rise inline-block"
                    style={{ animationDelay: `${i * 45}ms` }}
                  >
                    {word}&nbsp;
                  </span>
                </span>
              ))}
            </p>
            <dl className="mt-3 lg:mt-6">
              {rows(book).map(([label, value], i) => (
                <div
                  key={label}
                  className="flex items-baseline justify-between gap-4 border-t border-ink py-1 lg:py-1.5"
                >
                  <dt className="text-[0.6rem] tracking-[0.18em] uppercase">
                    {label}
                  </dt>
                  <dd className="overflow-hidden text-right text-xs lg:text-sm">
                    <span
                      className="proto-rise block"
                      style={{ animationDelay: `${200 + i * 70}ms` }}
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

      {/* Right: the ribbons */}
      <nav
        aria-label="Menú"
        className="fixed top-0 right-3 z-20 flex items-start gap-1.5 lg:right-10 lg:gap-2.5"
      >
        {groups(books).map((g) => {
          const active = g.id === current;
          return (
            <div key={g.id} className="group/rib relative">
              <button
                type="button"
                onClick={() => {
                  focusBook(g.books[0]?.index ?? 0);
                }}
                aria-label={`Ir a ${g.name}`}
                className={`proto-ribbon flex w-5 items-end justify-center pb-5 shadow-sm transition-[height] duration-700 lg:w-8 ${SPRING} ${
                  active ? "h-32 lg:h-[42svh]" : "h-16 lg:h-28"
                } lg:group-focus-within/rib:h-[56svh] lg:group-hover/rib:h-[56svh]`}
                style={{ backgroundColor: g.color, color: CREAM }}
              >
                <span
                  className={`hidden rotate-180 text-[0.6rem] font-semibold tracking-[0.2em] whitespace-nowrap uppercase transition-opacity duration-500 [writing-mode:vertical-rl] lg:block ${
                    active
                      ? "opacity-100"
                      : "opacity-0 group-focus-within/rib:opacity-100 group-hover/rib:opacity-100"
                  }`}
                >
                  {g.name}
                </span>
              </button>
              {/* Desktop: the Colección's Manuales, revealed beside its ribbon */}
              <ol className="invisible absolute top-6 right-full mr-3 hidden w-64 translate-x-2 bg-paper/95 p-3 opacity-0 shadow-tapa backdrop-blur transition-all duration-300 group-focus-within/rib:visible group-focus-within/rib:translate-x-0 group-focus-within/rib:opacity-100 group-hover/rib:visible group-hover/rib:translate-x-0 group-hover/rib:opacity-100 lg:block">
                {g.books.map(({ book: b, index: i }) => (
                  <li key={b.path}>
                    <button
                      type="button"
                      onClick={() => {
                        focusBook(i);
                      }}
                      className={`flex w-full items-baseline gap-2 py-1 text-left text-sm hover:underline ${i === index ? "font-semibold" : ""}`}
                    >
                      <span className="w-5 shrink-0 text-[0.65rem] tabular-nums opacity-50">
                        {b.step ?? "·"}
                      </span>
                      <span className="font-serif">{b.title}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
        {/* The archive ribbon carries the footer */}
        <div className="group/rib relative">
          <Link
            to={ABOUT}
            aria-label="Sobre el archivo"
            className={`proto-ribbon flex h-12 w-5 items-end justify-center bg-ink pb-5 transition-[height] duration-700 lg:h-20 lg:w-8 ${SPRING} lg:group-focus-within/rib:h-[40svh] lg:group-hover/rib:h-[40svh]`}
            style={{ color: CREAM }}
          >
            <span className="hidden rotate-180 text-[0.6rem] font-semibold tracking-[0.2em] whitespace-nowrap uppercase opacity-0 transition-opacity duration-500 [writing-mode:vertical-rl] group-focus-within/rib:opacity-100 group-hover/rib:opacity-100 lg:block">
              Archivo
            </span>
          </Link>
          <div className="invisible absolute top-6 right-full mr-3 hidden w-60 translate-x-2 bg-paper/95 p-4 text-xs text-ink-muted opacity-0 shadow-tapa transition-all duration-300 group-hover/rib:visible group-hover/rib:translate-x-0 group-hover/rib:opacity-100 lg:block">
            <p className="font-serif text-base text-ink">Sobre el archivo →</p>
            <p className="mt-2">{LICENSE}</p>
            <p className="mt-1">© Raúl E. Paz Zanini</p>
          </div>
        </div>
      </nav>
    </>
  );
}
