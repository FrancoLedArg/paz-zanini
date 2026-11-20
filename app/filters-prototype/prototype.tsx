// PROTOTYPE (#75, round 4), never merged: the Colecciones as filters at the top centre of the Hélice pages, in the
// direction Franco picked ("A"): the names alone, the current in full ink and the other two at half, each name turning
// on hover and as it becomes current. The open question is the mark of the current one, `?marca=ninguna|raya|trazo|peso`
// (← / → or the bar). The words are gone; the menu is round 1's small dropdown, unjudged. Earlier rounds: 9a70c008
// (1), f151fa0f (2: A, B, C), e79a5def (3: A with the dot).
import {
  type MouseEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router";

import type { ColeccionId } from "../catalog/catalog";
import { useColecciones } from "../shared/coleccion";
import { useHydrated } from "../shared/hydrated";
import { LICENSE_URL } from "../shared/license";
import {
  canMove,
  changeColeccion,
  changingTo,
  prewarm,
} from "../shared/movement";
import { Pencil, useIdea } from "../audit-prototype/prototype";
import "./prototype.css";

const SHORT: Record<ColeccionId, string> = {
  "estadistica-desde-cero": "Estadística",
  "ciencia-de-datos-desde-cero": "Ciencia de datos",
  "estadistica-aplicada": "Estadística aplicada",
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

const MARKS = {
  ninguna: "sin marca: solo tinta plena y media tinta",
  raya: "una raya fina bajo el nombre, que viaja y toma su ancho",
  trazo: "un subrayado que se dibuja en el nuevo y se borra en el viejo",
  peso: "el nombre actual en un peso más firme",
} as const;
type Mark = keyof typeof MARKS;
const MARK_KEYS = Object.keys(MARKS) as Mark[];

let mark: Mark = "trazo";
let read = false;
const listeners = new Set<() => void>();

function load() {
  if (read) return;
  read = true;
  const asked =
    new URLSearchParams(location.search).get("marca") ??
    sessionStorage.getItem("marca");
  if (asked && asked in MARKS) mark = asked as Mark;
}

function chooseMark(next: Mark) {
  mark = next;
  sessionStorage.setItem("marca", next);
  const url = new URL(location.href);
  url.searchParams.set("marca", next);
  history.replaceState(history.state, "", url);
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

function useMark(): Mark {
  return useSyncExternalStore<Mark>(
    subscribe,
    () => {
      load();
      return mark;
    },
    () => "trazo",
  );
}

/** The floating bar: ← marca →, development only; `?bar=0` hides it. */
export function Switcher() {
  const current = useMark();
  const hydrated = useHydrated();
  const step = (by: number) => {
    const i = MARK_KEYS.indexOf(current);
    chooseMark(
      MARK_KEYS[(i + by + MARK_KEYS.length) % MARK_KEYS.length] ?? "raya",
    );
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest("input, textarea")) return;
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "ArrowRight") step(1);
    };
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
    };
  });
  if (
    !import.meta.env.DEV ||
    !hydrated ||
    new URLSearchParams(location.search).get("bar") === "0"
  )
    return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/85 p-1 font-mono text-xs whitespace-nowrap text-white shadow-lg">
      <button
        type="button"
        onClick={() => {
          step(-1);
        }}
        className="rounded-full px-3 py-1.5 hover:bg-white/15"
      >
        ←
      </button>
      <span className="px-2">marca={current}</span>
      <button
        type="button"
        onClick={() => {
          step(1);
        }}
        className="rounded-full px-3 py-1.5 hover:bg-white/15"
      >
        →
      </button>
    </div>
  );
}

/** Where the selected name sits inside the nav (layout box, so a press's scale doesn't skew it). */
function useLabelBox(selected: ColeccionId | undefined) {
  const nav = useRef<HTMLElement>(null);
  const [box, setBox] = useState<{ x: number; width: number } | null>(null);
  // No slide into place on the first measure: it would fly in from the left edge.
  const [placed, setPlaced] = useState(false);
  useLayoutEffect(() => {
    const measure = () => {
      const label = nav.current?.querySelector<HTMLElement>(
        `[data-id="${selected}"] [data-label]`,
      );
      const link = label?.closest<HTMLElement>("a");
      if (!label || !link) return;
      setBox({
        x: link.offsetLeft + label.offsetLeft,
        width: label.offsetWidth,
      });
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
 * The three Colecciones as filters: their names in a row, the current in full ink, the other two at half. The current
 * one is marked as `?marca=` says. Each name turns (slides up out of its line and back in from below) on hover and as
 * it becomes current. A navigation of three links, the current one aria-current="page" (NavLink). A tap plays #70's
 * change at once while the 3D is shown; otherwise it is a plain link.
 */
export function Filters() {
  const colecciones = useColecciones();
  const marca = useMark();
  const lapiz = useIdea("lapiz");
  const { selected, select } = useSelected();
  const { nav, box, placed } = useLabelBox(selected);
  const navigate = useNavigate();

  const onClick = (
    event: MouseEvent<HTMLAnchorElement>,
    id: ColeccionId,
    path: string,
  ) => {
    const modified =
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (modified) return;
    const current = event.currentTarget.getAttribute("aria-current") === "page";
    if (!current || changingTo() !== null) select(id);
    if (!canMove() || (current && changingTo() === null)) return;
    event.preventDefault();
    prewarm(id);
    void changeColeccion(id, () => navigate(path));
  };

  return (
    <nav
      ref={nav}
      aria-label="Colecciones"
      className="fixed inset-x-0 top-12 z-20 mx-auto grid w-fit max-w-[calc(100vw-2rem)] grid-cols-[repeat(3,auto)] justify-center text-[13px] leading-none font-medium tracking-[-0.02em] lg:top-1 lg:gap-x-1"
    >
      {colecciones.map(({ id, name, path }, index) => {
        const on = id === selected;
        return (
          <NavLink
            key={path}
            to={path}
            data-id={id}
            aria-label={name}
            onClick={(event) => {
              onClick(event, id, path);
            }}
            style={{ animationDelay: `${300 + index * 70}ms` }}
            className="press group/f relative flex min-h-11 items-center justify-center px-1.5 text-center outline-offset-2 focus-visible:outline-2 focus-visible:outline-ink motion-safe:animate-rise-in"
          >
            <span
              data-label
              className={`relative inline-grid overflow-hidden py-0.5 transition-opacity duration-300 ${on ? "opacity-100" : "opacity-50 group-hover/f:opacity-100"}`}
            >
              {/* With `peso`, an invisible semibold copy holds the width, so the row never shifts as the weight moves. */}
              {marca === "peso" && (
                <span
                  aria-hidden="true"
                  className="invisible font-semibold text-balance [grid-area:1/1]"
                >
                  {SHORT[id]}
                </span>
              )}
              {/* A hover turns the name (CSS); a tap doesn't (Franco, round 4). */}
              <span
                className={`turn text-balance [grid-area:1/1] ${marca === "peso" ? `weight ${on ? "font-semibold" : "font-normal"}` : ""}`}
              >
                {SHORT[id]}
              </span>
              {marca === "trazo" && lapiz === "no" && (
                <span
                  aria-hidden="true"
                  className={`stroke absolute inset-x-0 bottom-0 h-px bg-ink ${on ? "stroke-on" : ""}`}
                />
              )}
            </span>
            {/* PROTOTYPE (#77): with any lapiz, the trazo is a pencil stroke (outside the label, which clips the turn). */}
            {marca === "trazo" && lapiz !== "no" && (
              <Pencil
                on={on}
                shape="underline"
                seed={index + 1}
                delay={0.1}
                className="absolute inset-x-1.5 bottom-[8px] h-1.5"
              />
            )}
          </NavLink>
        );
      })}
      {marca === "raya" && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute bottom-2 left-0 h-px bg-ink ${placed ? "rule-move" : ""}`}
          style={{
            translate: box ? `${box.x}px 0` : undefined,
            width: box?.width,
            opacity: box ? 1 : 0,
          }}
        />
      )}
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
