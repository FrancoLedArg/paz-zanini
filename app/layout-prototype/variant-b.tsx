// PROTOTYPE (#30), never merged. Variant B "Índice-tapa": a spine on the right edge opens like a book's cover into a
// table of contents; hovering a row brings that book into focus behind it.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import { Pila } from "../pila/pila";
import {
  ABOUT,
  focusBook,
  groups,
  LICENSE,
  type ProtoBook,
  useFocus,
} from "./shared";

export function VariantB({ books }: { books: ProtoBook[] }) {
  const index = useFocus();
  const book = books[index] ?? books[0];
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const closer = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closer.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        opener.current?.focus();
      }
    };
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    opener.current?.focus();
  };

  return (
    <>
      <main className="mx-auto w-full px-4 pt-20 pb-36 lg:max-w-[min(56rem,calc(100vw-40rem))] lg:px-0 lg:pt-[12svh]">
        <h1 className="sr-only">Manuales de Raúl E. Paz Zanini</h1>
        <Pila books={books} />
      </main>

      {/* Wordmark: one line on a phone, stacked on desktop */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-paper via-paper/80 to-transparent px-4 pt-3 pb-6 lg:inset-x-auto lg:top-8 lg:left-8 lg:block lg:bg-none lg:p-0">
        <Link to="/" className="pointer-events-auto block leading-none">
          <span className="font-serif text-lg font-semibold lg:block lg:font-sans lg:text-xs lg:font-medium lg:tracking-[0.3em] lg:uppercase">
            Raúl E.{" "}
          </span>
          <span className="font-serif text-lg font-semibold tracking-tight lg:mt-1 lg:block lg:text-5xl">
            Paz Zanini
          </span>
        </Link>
        <button
          type="button"
          onClick={() => {
            setOpen(true);
          }}
          aria-expanded={open}
          className="pointer-events-auto flex min-h-11 items-center gap-2 font-serif text-lg lg:hidden"
        >
          Índice{" "}
          <span aria-hidden className="text-sm">
            {books.length}
          </span>
        </button>
      </header>

      {/* The book in focus, as a caption, bottom left */}
      {book && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-paper via-paper/90 to-transparent px-4 pt-10 pb-16 lg:inset-x-auto lg:bottom-8 lg:left-8 lg:w-72 lg:bg-none lg:p-0">
          <div key={index} aria-live="polite">
            <p className="proto-fade text-xs text-ink-muted">
              {book.coleccion} · {book.carrera ?? `Paso ${book.step ?? ""}`}
            </p>
            <p
              className="proto-fade mt-1 font-serif text-2xl leading-tight font-semibold text-balance lg:text-4xl"
              style={{ animationDelay: "60ms" }}
            >
              {book.title}
            </p>
            <p
              className="proto-fade mt-2 text-sm"
              style={{ animationDelay: "120ms" }}
            >
              {book.herramientas || "Sin software"}
            </p>
          </div>
        </div>
      )}

      {/* Desktop: the spine on the right edge */}
      <button
        ref={opener}
        type="button"
        onClick={() => {
          setOpen(true);
        }}
        aria-expanded={open}
        className="group fixed inset-y-0 right-0 z-10 hidden w-16 flex-col items-center justify-between border-l border-ink/15 bg-paper py-8 transition-[width,background-color] duration-500 ease-[cubic-bezier(.2,.7,0,1)] hover:w-20 hover:bg-[#fbf6ea] lg:flex"
      >
        <span className="text-[0.6rem] tracking-[0.2em] text-ink-muted uppercase">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="rotate-180 font-serif text-2xl font-semibold [writing-mode:vertical-rl]">
          Índice
        </span>
        <span className="text-[0.6rem] tracking-[0.2em] text-ink-muted uppercase">
          {books.length}
        </span>
      </button>

      {/* The cover: hinged on the right edge, it swings open toward the visitor */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Índice"
        inert={!open}
        className={`fixed inset-y-0 right-0 z-30 flex w-full origin-right flex-col overflow-y-auto bg-[#fbf6ea] shadow-tapa transition-[transform,opacity,visibility] duration-700 ease-[cubic-bezier(.2,.7,0,1)] sm:w-[30rem] ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
        style={{
          transform: open
            ? "perspective(1800px) rotateY(0deg)"
            : "perspective(1800px) rotateY(75deg)",
        }}
      >
        <div className="flex items-baseline justify-between px-8 pt-8">
          <h2 className="font-serif text-4xl font-semibold">Índice</h2>
          <button
            ref={closer}
            type="button"
            onClick={close}
            className="min-h-11 text-sm underline underline-offset-4"
          >
            Cerrar
          </button>
        </div>
        <div key={String(open)} className="flex-1 px-8 pt-6 pb-8">
          {groups(books).map((g, gi) => (
            <section
              key={g.id}
              className="proto-fade mt-6 first:mt-0"
              style={{ animationDelay: `${150 + gi * 90}ms` }}
            >
              <h3 className="flex items-center gap-2 text-[0.65rem] tracking-[0.2em] text-ink-muted uppercase">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: g.color }}
                />
                {g.name}
              </h3>
              <ol className="mt-2">
                {g.books.map(({ book: b, index: i }) => (
                  <li key={b.path}>
                    <Link
                      to={b.path}
                      onMouseEnter={() => {
                        focusBook(i);
                      }}
                      onFocus={() => {
                        focusBook(i);
                      }}
                      className={`flex min-h-9 items-baseline gap-2 px-1 py-1.5 text-sm transition-colors ${
                        i === index ? "bg-ink text-paper" : "hover:bg-ink/5"
                      }`}
                    >
                      <span className="w-6 shrink-0 text-xs tabular-nums opacity-60">
                        {b.step ? String(b.step).padStart(2, "0") : "·"}
                      </span>
                      <span className="font-serif">{b.title}</span>
                      <span
                        aria-hidden
                        className="mb-1 flex-1 border-b border-dotted border-current opacity-30"
                      />
                      <span className="shrink-0 text-xs opacity-70">
                        {b.herramientas}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
        <footer className="border-t border-ink/15 px-8 py-6 text-xs text-ink-muted">
          <Link
            to={ABOUT}
            className="font-serif text-base text-ink underline underline-offset-4"
          >
            Sobre el archivo →
          </Link>
          <p className="mt-3">{LICENSE}</p>
          <p className="mt-1">© Raúl E. Paz Zanini</p>
        </footer>
      </div>
    </>
  );
}
