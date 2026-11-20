import { type CSSProperties, type ReactNode, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router";

import { useColecciones } from "./coleccion";
import { LICENSE_URL } from "./license";
import { reducedMotion } from "./motion";
import { canMove, changeColeccion, prewarm } from "./movement";

const PAGES = [
  { to: "/autor", label: "Sobre el Autor" },
  { to: "/archivo", label: "Sobre el archivo" },
  { to: "/contacto", label: "Contacto" },
];
const SMALL_CAPS = "text-xs tracking-widest uppercase";
const BUTTON = `inline-flex min-h-11 items-center gap-3 outline-offset-4 focus-visible:outline-2 focus-visible:outline-ink ${SMALL_CAPS}`;

/** Each row rises in after the sheet has begun to unroll, one after another. */
const rowDelay = (index: number): CSSProperties => ({
  animationDelay: `${250 + index * 60}ms`,
});

/** A row of the index: it rises in on its turn as its hairline draws in from the left. */
function Row({ index, children }: { index: number; children: ReactNode }) {
  return (
    <li
      className="relative motion-safe:animate-rise-in"
      style={rowDelay(index)}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px origin-left bg-rule motion-safe:animate-draw-in"
        style={rowDelay(index)}
      />
      {children}
    </li>
  );
}

/**
 * The menu (#58, "Índice"): a button at the top right that opens a full-screen index over the paper, holding the
 * Colecciones (each its own Hélice, on its own page), the pages about the archive and the license. A native modal dialog: Tab
 * stays inside, Escape closes it, and focus returns to the button.
 */
export function Menu() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<"closed" | "open" | "closing">("closed");
  const colecciones = useColecciones();
  const here = useLocation().pathname;
  const navigate = useNavigate();

  const close = () => {
    if (state !== "open") return;
    // Without motion there is no closing animation to wait for.
    if (reducedMotion()) dialog.current?.close();
    else setState("closing");
  };

  return (
    <>
      <button
        type="button"
        aria-expanded={state === "open"}
        aria-haspopup="dialog"
        onClick={() => {
          dialog.current?.showModal();
          setState("open");
        }}
        className={BUTTON}
      >
        Índice
        <span aria-hidden="true" className="h-px w-6 bg-ink" />
      </button>
      <dialog
        ref={dialog}
        aria-label="Índice"
        data-state={state}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={() => {
          // The close event comes a task late: a menu reopened in between is open again, not closed.
          if (!dialog.current?.open) setState("closed");
        }}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget && state === "closing")
            dialog.current?.close();
        }}
        className="m-0 h-dvh max-h-none w-full max-w-none bg-paper p-0 text-ink backdrop:bg-transparent data-[state=closing]:motion-safe:animate-roll-up data-[state=open]:motion-safe:animate-unroll"
      >
        <div className="flex min-h-full flex-col px-4 pt-3 pb-6 lg:px-16 lg:pt-8 lg:pb-10">
          <div className="flex items-start justify-between">
            <span className="inline-flex min-h-11 items-center font-serif text-base tracking-tight lg:text-lg">
              Raúl E. Paz Zanini
            </span>
            <button type="button" onClick={close} className={BUTTON}>
              Cerrar
              <span aria-hidden="true" className="h-px w-6 rotate-45 bg-ink" />
            </button>
          </div>
          <div className="mt-10 grid flex-1 content-start gap-12 lg:mt-20 lg:grid-cols-12 lg:gap-16">
            <nav aria-labelledby="indice-colecciones" className="lg:col-span-7">
              <h2
                id="indice-colecciones"
                className={`text-ink-muted motion-safe:animate-rise-in ${SMALL_CAPS}`}
                style={rowDelay(0)}
              >
                Colecciones
              </h2>
              <ul className="mt-4">
                {colecciones.map(
                  ({ id, name, numeral, path, count }, index) => (
                    <Row key={path} index={index + 1}>
                      {/* NavLink marks the current page aria-current="page". No `end`: the prerender renders each page at
                        its path with a trailing slash, which `end` wouldn't match (`/` matches only itself either way). */}
                      <NavLink
                        to={path}
                        onClick={(event) => {
                          close();
                          // The prerendered page answers at its path with a trailing slash too.
                          const current = here === path || here === `${path}/`;
                          const modified =
                            event.metaKey ||
                            event.ctrlKey ||
                            event.shiftKey ||
                            event.altKey;
                          if (current || modified || !canMove()) return;
                          event.preventDefault();
                          // Drawing the covers is the change's heaviest work: done under the sheet, not the moving books.
                          prewarm(id);
                          // The change starts as the sheet finishes rolling up: the exit's first 0.2 s barely moves, so
                          // the whole movement is seen, without a pause between the two.
                          setTimeout(() => {
                            void changeColeccion(id, () => navigate(path));
                          }, 280);
                        }}
                        // The current row is ink; the others are muted and turn ink on hover.
                        className={({ isActive }) =>
                          `grid min-h-14 grid-cols-[2.5rem_1fr_auto] items-baseline gap-4 py-3 outline-offset-2 transition-colors focus-visible:outline-2 focus-visible:outline-ink lg:min-h-20 lg:py-5 ${isActive ? "text-ink" : "text-ink-muted hover:text-ink"}`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <span aria-hidden="true" className={SMALL_CAPS}>
                              {numeral}
                            </span>
                            <span className="font-serif text-2xl leading-tight lg:text-4xl">
                              {name}
                            </span>
                            <span className="text-xs tabular-nums">
                              {isActive && "Estás acá · "}
                              {count} Manuales
                            </span>
                          </>
                        )}
                      </NavLink>
                    </Row>
                  ),
                )}
              </ul>
            </nav>
            <nav
              aria-labelledby="indice-archivo"
              className="lg:col-span-4 lg:col-start-9"
            >
              <h2
                id="indice-archivo"
                className={`text-ink-muted motion-safe:animate-rise-in ${SMALL_CAPS}`}
                style={rowDelay(2)}
              >
                El archivo
              </h2>
              <ul className="mt-4">
                {PAGES.map(({ to, label }, index) => (
                  <Row key={to} index={index + 3}>
                    <Link
                      to={to}
                      onClick={close}
                      className="flex min-h-12 items-center font-serif text-lg outline-offset-2 focus-visible:outline-2 focus-visible:outline-ink lg:text-xl"
                    >
                      {label}
                    </Link>
                  </Row>
                ))}
              </ul>
            </nav>
          </div>
          <p
            className="mt-12 max-w-md text-xs text-pretty text-ink-muted motion-safe:animate-rise-in"
            style={rowDelay(6)}
          >
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
      </dialog>
    </>
  );
}
