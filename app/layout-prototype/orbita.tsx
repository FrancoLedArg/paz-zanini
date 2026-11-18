// PROTOTYPE, never merged: the frame shared by the three paths (helix, rolodex, tunnel). Native vertical scroll over
// a tall track with one soft snap point per Manual; the book in focus's words as large HTML text.
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import { useHydrated } from "../shared/hydrated";
import type { PliegoBook } from "./pliego";
import type { BookPath } from "./orbita-scene";
import "./orbita.css";

const PathView = lazy(() =>
  import("./orbita-scene").then(
    (module) => ({ default: module.PathView }),
    () => ({ default: () => null }),
  ),
);

const ABOUT = "/acerca";

interface Props {
  books: PliegoBook[];
  path: BookPath;
}

export function Orbita({ books, path }: Props) {
  const hydrated = useHydrated();
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const root = document.documentElement;
    root.style.scrollSnapType = "y proximity";
    const onScroll = () => {
      const second = track.current?.children[1] as HTMLElement | undefined;
      const step = second?.offsetTop ?? innerHeight;
      setActive(
        Math.min(books.length - 1, Math.max(0, Math.round(scrollY / step))),
      );
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      root.style.scrollSnapType = "";
      removeEventListener("scroll", onScroll);
    };
  }, [books.length]);

  const book = books[active];
  return (
    <main>
      <h1 className="sr-only">Manuales de Raúl E. Paz Zanini</h1>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-3 lg:px-16 lg:pt-8">
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

      <ol aria-label="Manuales" className="sr-only">
        {books.map((b) => (
          <li key={b.slug}>
            <Link to={b.path}>{b.title}</Link>
          </li>
        ))}
      </ol>

      {/* The scroll track: one step per Manual, each a soft snap point. */}
      <div
        ref={track}
        aria-hidden="true"
        className="relative [--step:62lvh]"
        style={{
          height: `calc(var(--step) * ${books.length - 1} + 100lvh)`,
        }}
      >
        {books.map((b, i) => (
          <div
            key={b.slug}
            className="absolute h-px w-full snap-start"
            style={{ top: `calc(var(--step) * ${i})` }}
          />
        ))}
      </div>

      {hydrated && (
        <Suspense>
          <PathView
            path={path}
            track={track}
            className="fixed inset-0 z-5 h-lvh"
          />
        </Suspense>
      )}

      {book && (
        <div
          key={book.slug}
          className="pointer-events-none fixed inset-x-4 bottom-6 z-10 lg:top-1/2 lg:right-auto lg:bottom-auto lg:left-16 lg:w-[24vw] lg:max-w-[26rem] lg:-translate-y-1/2"
        >
          <div className="orbita-in flex items-baseline gap-3">
            <span
              className="font-serif text-4xl leading-none font-light lg:text-[7rem]"
              style={{ color: book.color }}
            >
              {book.number}
            </span>
            <span className="text-[0.625rem] tracking-widest text-ink-muted uppercase">
              {book.coleccionName}
            </span>
          </div>
          <h2 className="orbita-in mt-2 font-serif text-[1.75rem] leading-[1.05] font-semibold text-balance [animation-delay:60ms] lg:mt-4 lg:text-5xl">
            <Link
              to={book.path}
              className="pointer-events-auto hover:underline"
            >
              {book.title}
            </Link>
          </h2>
          <p className="orbita-in mt-2 text-xs text-ink-muted [animation-delay:120ms] lg:text-sm">
            {book.mark} · {book.herramientas || "Sin software"} · {book.pages}{" "}
            páginas
          </p>
        </div>
      )}
    </main>
  );
}
