import { Link } from "react-router";

import { LICENSE_URL } from "./license";

const PAGES = [
  { to: "/autor", label: "Sobre el Autor" },
  { to: "/archivo", label: "Sobre el archivo" },
  { to: "/contacto", label: "Contacto" },
];

/**
 * The menu ("Índice"): a small dropdown at the top right of every page (bottom right on the Hélice pages) with the pages about the archive and the
 * license. The Colecciones are the filters on the Hélice pages (#76). Interim: its form waits on Franco's pick (#75).
 * A native popover: a tap outside or Escape closes it, focus returns to the button, and its links follow the button in
 * the tab order.
 */
export function Menu() {
  return (
    <>
      <button
        type="button"
        popoverTarget="indice"
        className="ml-auto inline-flex min-h-11 items-center gap-2 text-xs tracking-widest uppercase outline-offset-4 [anchor-name:--indice] focus-visible:outline-2 focus-visible:outline-ink"
      >
        Índice
        <span aria-hidden="true" className="text-ink-muted">
          ▾
        </span>
      </button>
      <div
        id="indice"
        popover="auto"
        // Hung under its button, or over it when there's no room below (the Hélice pages' bottom corner); where anchors
        // aren't supported, at the top right.
        className="fixed inset-auto top-12 right-4 m-0 w-64 bg-paper p-0 text-ink shadow-tapa [position-anchor:--indice] [position-area:bottom_span-left] [position-try-fallbacks:flip-block] supports-[position-area:bottom]:inset-auto lg:right-5"
      >
        <nav
          aria-label="Índice"
          className="px-5 pt-3 pb-1 motion-safe:animate-rise-in"
        >
          <ul>
            {PAGES.map(({ to, label }) => (
              <li key={to} className="border-b border-rule last:border-0">
                <Link
                  to={to}
                  onClick={(event) => {
                    event.currentTarget
                      .closest<HTMLElement>("[popover]")
                      ?.hidePopover();
                  }}
                  className="flex min-h-12 items-center font-serif text-lg outline-offset-2 focus-visible:outline-2 focus-visible:outline-ink"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="px-5 pt-2 pb-4 text-xs text-pretty text-ink-muted">
          Todos los Manuales son gratuitos, con licencia{" "}
          <a
            href={LICENSE_URL}
            className="underline decoration-rule underline-offset-2 hover:decoration-ink"
          >
            CC BY-NC-SA 4.0
          </a>
          . © Raúl E. Paz Zanini.
        </p>
      </div>
    </>
  );
}
