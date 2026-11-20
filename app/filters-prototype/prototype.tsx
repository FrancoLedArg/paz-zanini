// PROTOTYPE (#75, round 3), never merged: the Colecciones as filters at the top centre of the Hélice pages, in the
// direction Franco picked from round 2 ("A · Punto"): the names alone, the other two at half ink, a dot in the current
// Colección's ink that travels on the tap. The words are gone; the menu is round 1's small dropdown, unjudged. Round 1
// is commit 9a70c008, round 2 (A, B, C) is f151fa0f.
import {
  type MouseEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router";

import type { ColeccionId } from "../catalog/catalog";
import { useColecciones } from "../shared/coleccion";
import { LICENSE_URL } from "../shared/license";
import {
  canMove,
  changeColeccion,
  changingTo,
  prewarm,
} from "../shared/movement";
import "./prototype.css";

const SHORT: Record<ColeccionId, string> = {
  "estadistica-desde-cero": "Estadística",
  "ciencia-de-datos-desde-cero": "Ciencia de datos",
  "estadistica-aplicada": "Estadística aplicada",
};

/** Each Colección's ink: the band of its first Tapa (app/tapa); Estadística aplicada, made of three Campos, takes a warm one. */
const INK: Record<ColeccionId, string> = {
  "estadistica-desde-cero": "oklch(0.48 0.11 252)",
  "ciencia-de-datos-desde-cero": "oklch(0.48 0.085 168)",
  "estadistica-aplicada": "oklch(0.47 0.11 40)",
};

/**
 * The Colección the filters show as current: the one tapped, from the tap (the URL changes only after the exit,
 * ~0.6 s later), else the page's.
 */
function useSelected() {
  const colecciones = useColecciones();
  const { pathname } = useLocation();
  const page =
    colecciones.find(({ path }) =>
      path === "/" ? pathname === "/" : pathname.startsWith(path),
    )?.id ?? colecciones[0]?.id;
  // A tap counts only on the page it was made on: once the page catches up (or Back moves it), it is spent.
  const [tapped, setTapped] = useState<{ id: ColeccionId; on: string } | null>(
    null,
  );
  const selected = tapped?.on === pathname ? tapped.id : page;
  return {
    selected,
    select: (id: ColeccionId) => {
      setTapped({ id, on: pathname });
    },
  };
}

/** Where the selected link sits inside the nav, re-read on resize and once the webfont has loaded. */
function useMarker(selected: ColeccionId | undefined) {
  const nav = useRef<HTMLElement>(null);
  const [box, setBox] = useState<{ x: number; width: number } | null>(null);
  // No slide into place on the first measure: it would fly in from the left edge.
  const [placed, setPlaced] = useState(false);
  useLayoutEffect(() => {
    const measure = () => {
      const link = nav.current?.querySelector<HTMLElement>(
        `[data-id="${selected}"]`,
      );
      if (!link) return;
      setBox({ x: link.offsetLeft, width: link.offsetWidth });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (nav.current) observer.observe(nav.current);
    void document.fonts.ready.then(measure);
    return () => {
      observer.disconnect();
    };
  }, [selected]);
  useEffect(() => {
    if (box && !placed)
      requestAnimationFrame(() => {
        setPlaced(true);
      });
  }, [box, placed]);
  return { nav, box, placed };
}

/**
 * The three Colecciones as filters: their names in a row, the other two at half ink. A dot in the current Colección's
 * ink sits under it and travels to the one tapped, taking its colour. A navigation of three links, the current one
 * aria-current="page" (NavLink). A tap plays #70's change at once while the 3D is shown; otherwise it is a plain link.
 */
export function Filters() {
  const colecciones = useColecciones();
  const { selected, select } = useSelected();
  const { nav, box, placed } = useMarker(selected);
  const navigate = useNavigate();

  const onClick = (
    event: MouseEvent<HTMLAnchorElement>,
    id: ColeccionId,
    path: string,
  ) => {
    const modified =
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (modified) return;
    select(id);
    const current = event.currentTarget.getAttribute("aria-current") === "page";
    if (!canMove() || (current && changingTo() === null)) return;
    event.preventDefault();
    prewarm(id);
    void changeColeccion(id, () => navigate(path));
  };

  return (
    <nav
      ref={nav}
      aria-label="Colecciones"
      className="fixed inset-x-0 top-12 z-20 mx-auto grid w-fit max-w-[calc(100vw-2rem)] grid-cols-[repeat(3,auto)] justify-center gap-x-3 text-[13px] leading-none font-medium tracking-[-0.02em] lg:top-1 lg:gap-x-5"
    >
      {colecciones.map(({ id, name, path }, index) => (
        <NavLink
          key={path}
          to={path}
          data-id={id}
          aria-label={name}
          onClick={(event) => {
            onClick(event, id, path);
          }}
          style={{ animationDelay: `${300 + index * 70}ms` }}
          className="press flex min-h-11 items-center justify-center px-1 text-center outline-offset-2 focus-visible:outline-2 focus-visible:outline-ink motion-safe:animate-rise-in"
        >
          <span
            className={`text-balance transition-opacity duration-300 ${id === selected ? "opacity-100" : "opacity-50 hover:opacity-100"}`}
          >
            {SHORT[id]}
          </span>
        </NavLink>
      ))}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-1 left-0 size-[5px] rounded-full ${placed ? "marker-move" : ""}`}
        style={{
          translate: box ? `${box.x + box.width / 2 - 2.5}px 0` : undefined,
          backgroundColor: selected ? INK[selected] : undefined,
          opacity: box ? 1 : 0,
        }}
      />
    </nav>
  );
}

const PAGES = [
  { to: "/autor", label: "Sobre el Autor" },
  { to: "/archivo", label: "Sobre el archivo" },
  { to: "/contacto", label: "Contacto" },
];

/** Round 1's small dropdown menu, kept as is so the header has its links; not in question. */
export function ProtoMenu() {
  return (
    <>
      <button
        type="button"
        popoverTarget="indice"
        className="inline-flex min-h-11 items-center gap-2 text-xs tracking-widest uppercase outline-offset-4 focus-visible:outline-2 focus-visible:outline-ink"
      >
        Índice
        <span aria-hidden="true" className="text-ink-muted">
          ▾
        </span>
      </button>
      <div
        id="indice"
        popover="auto"
        className="fixed inset-auto top-12 right-4 m-0 w-64 bg-paper p-0 text-ink shadow-tapa lg:right-5"
      >
        <nav
          aria-label="El archivo"
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
          </a>{" "}
          · © Raúl E. Paz Zanini.
        </p>
      </div>
    </>
  );
}
