// PROTOTYPE (#30), never merged. Variant A, as Franco picked it: la Pila framed by the Autor's name and a quiet
// nav; no book details, no index.
import { Link } from "react-router";

import { Pila, type PilaBook } from "../pila/pila";

const ABOUT = "/acerca"; // the info page, #34

export function VariantA({ books }: { books: PilaBook[] }) {
  return (
    <>
      <main className="mx-auto w-full px-4 pt-20 pb-20 lg:max-w-[min(56rem,calc(100vw-40rem))] lg:px-0 lg:pt-[12svh]">
        <h1 className="sr-only">Manuales de Raúl E. Paz Zanini</h1>
        <Pila books={books} />
      </main>

      {/* Left: the wordmark. On a phone it shares a top bar with the nav. */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-10 flex items-center justify-between bg-paper/85 px-4 py-3 backdrop-blur lg:inset-x-auto lg:top-8 lg:left-8 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <Link
          to="/"
          className="pointer-events-auto font-serif text-lg font-semibold tracking-tight lg:text-2xl"
        >
          Raúl E. Paz Zanini
        </Link>
        <Link
          to={ABOUT}
          className="pointer-events-auto flex min-h-11 items-center text-sm lg:hidden"
        >
          Archivo
        </Link>
      </header>

      {/* Right: nav at the top, the license at the bottom */}
      <nav
        aria-label="Menú"
        className="pointer-events-none fixed top-8 right-8 bottom-8 z-10 hidden w-72 flex-col items-end justify-between lg:flex"
      >
        <ul className="flex gap-6 text-sm">
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
        <footer className="max-w-60 text-right text-xs text-ink-muted">
          <p>Todos los Manuales son gratuitos, con licencia CC BY-NC-SA 4.0.</p>
          <p className="mt-1">© Raúl E. Paz Zanini</p>
        </footer>
      </nav>
    </>
  );
}
