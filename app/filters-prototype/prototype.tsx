// PROTOTYPE (#75, round 2), never merged: three directions for the Colecciones as filters at the top centre of the
// Hélice pages, switched by `?variant=A|B|C` (← / → or the bar; `?bar=0` hides it). Only the filters are in question:
// the words are gone and the menu is round 1's small dropdown, unjudged. Round 1 (every option as query params) is
// commit 9a70c008 on this branch.
import {
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
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

const VARIANTS = {
  A: "Punto",
  B: "Señalador",
  C: "Numeral",
} as const;
type Variant = keyof typeof VARIANTS;
const KEYS = Object.keys(VARIANTS) as Variant[];

let variant: Variant = "A";
let bar = true;
let read = false;
const listeners = new Set<() => void>();

function load() {
  if (read) return;
  read = true;
  const params = new URLSearchParams(location.search);
  const asked = params.get("variant") ?? sessionStorage.getItem("variant");
  if (asked && asked in VARIANTS) variant = asked as Variant;
  bar = params.get("bar") !== "0";
}

function choose(next: Variant) {
  variant = next;
  sessionStorage.setItem("variant", next);
  const url = new URL(location.href);
  url.searchParams.set("variant", next);
  history.replaceState(history.state, "", url);
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

function useVariant(): Variant {
  return useSyncExternalStore<Variant>(
    subscribe,
    () => {
      load();
      return variant;
    },
    () => "A",
  );
}

/** Whether the bar shows: false on the prerendered page, read from `?bar` once hydrated. */
function useBar() {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return bar;
    },
    () => false,
  );
}

/** The floating bar: ← variant →, development only. */
export function Switcher() {
  const current = useVariant();
  const shown = useBar();
  const step = (by: number) => {
    choose(
      KEYS[(KEYS.indexOf(current) + by + KEYS.length) % KEYS.length] ?? "A",
    );
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, [contenteditable]")) return;
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "ArrowRight") step(1);
    };
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
    };
  });
  if (!import.meta.env.DEV || !shown) return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/85 p-1 font-mono text-xs text-white shadow-lg">
      <button
        type="button"
        onClick={() => {
          step(-1);
        }}
        className="rounded-full px-3 py-1.5 hover:bg-white/15"
      >
        ←
      </button>
      <span className="px-2">
        {current} · {VARIANTS[current]}
      </span>
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

/** A filter's tap plays #70's change at once while the 3D is shown; otherwise it is a plain link. */
function useChange(select: (id: ColeccionId) => void) {
  const navigate = useNavigate();
  return (
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

interface LinkState {
  selected: boolean;
  name: string;
  numeral: string;
  count: number;
  id: ColeccionId;
}

interface FilterProps {
  className?: string;
  style?: CSSProperties;
  children: (state: LinkState) => ReactNode;
}

/** The three links, with the tap wiring and the entrance; each variant dresses them. */
function useLinks(
  selected: ColeccionId | undefined,
  select: (id: ColeccionId) => void,
) {
  const colecciones = useColecciones();
  const change = useChange(select);
  return ({ className = "", style, children }: FilterProps) =>
    colecciones.map(({ id, name, numeral, path, count }, index) => (
      <NavLink
        key={path}
        to={path}
        data-id={id}
        aria-label={name}
        onClick={(event) => {
          change(event, id, path);
        }}
        style={{ ...style, animationDelay: `${300 + index * 70}ms` }}
        className={`press outline-offset-4 focus-visible:outline-2 focus-visible:outline-ink motion-safe:animate-rise-in ${className}`}
      >
        {children({ selected: id === selected, name, numeral, count, id })}
      </NavLink>
    ));
}

/** The type of every variant's names: Hanken at 13 px, medium, tracked in 2%. */
const TYPE = "text-[13px] leading-none font-medium tracking-[-0.02em]";

/**
 * A · Punto: the names in a row, the others at half ink. A dot in the current Colección's ink sits under it and slides
 * to the one tapped, taking its colour. Hovering a name rolls it over to its count.
 */
function Punto() {
  const { selected, select } = useSelected();
  const { nav, box, placed } = useMarker(selected);
  const links = useLinks(selected, select);
  return (
    <nav
      ref={nav}
      aria-label="Colecciones"
      className={`fixed inset-x-0 top-15 z-20 mx-auto grid w-fit max-w-[calc(100vw-2rem)] grid-cols-[repeat(3,auto)] justify-center gap-x-5 lg:top-8 lg:gap-x-8 ${TYPE}`}
    >
      {links({
        className:
          "group/f relative flex min-h-11 items-center justify-center text-center",
        children: ({ selected: on, id, count }) => (
          // The current one stays its name: a hover only rolls the other two to their counts.
          <span
            className={`roll-inner ${on ? "" : "roll"} transition-opacity duration-300 ${on ? "opacity-100" : "opacity-50 group-hover/f:opacity-100"}`}
          >
            <span className="roll-text text-balance">{SHORT[id]}</span>
            <span aria-hidden="true" className="roll-next text-balance">
              {count} Manuales
            </span>
          </span>
        ),
      })}
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

/**
 * B · Señalador: the three on a faint track, the current one on a raised paper chip, like a bookmark between pages.
 * The chip slides to the one tapped and settles with a little give.
 */
function Senalador() {
  const { selected, select } = useSelected();
  const { nav, box, placed } = useMarker(selected);
  const links = useLinks(selected, select);
  return (
    <nav
      ref={nav}
      aria-label="Colecciones"
      className={`fixed inset-x-4 top-15 z-20 mx-auto grid max-w-sm grid-cols-3 rounded-full bg-ink/5 p-1 lg:inset-x-0 lg:top-8 lg:flex lg:w-fit lg:max-w-none ${TYPE}`}
    >
      <span
        aria-hidden="true"
        className={`chip pointer-events-none absolute top-1 bottom-1 left-0 rounded-full bg-leaf ${placed ? "marker-move chip-move" : ""}`}
        style={{
          translate: box ? `${box.x}px 0` : undefined,
          width: box?.width,
          opacity: box ? 1 : 0,
        }}
      />
      {links({
        className:
          "relative z-1 flex min-h-9 items-center justify-center px-2 text-center lg:px-4",
        children: ({ selected: on, id }) => (
          <span
            className={`text-balance transition-colors duration-300 ${on ? "text-ink" : "text-ink-muted hover:text-ink"}`}
          >
            {SHORT[id]}
          </span>
        ),
      })}
    </nav>
  );
}

/**
 * C · Numeral: the series as a running head. I · II · III in Newsreader; only the current one spells its name, which
 * opens beside its numeral and closes on the one left. Hovering a numeral shows its name under it.
 */
function Numeral() {
  const { selected, select } = useSelected();
  const links = useLinks(selected, select);
  return (
    <nav
      aria-label="Colecciones"
      className="fixed inset-x-0 top-15 z-20 mx-auto flex w-fit items-center gap-1 lg:top-8"
    >
      {links({
        className:
          "group/f relative flex min-h-11 min-w-11 items-baseline justify-center px-2 pt-[15px]",
        children: ({ selected: on, name, numeral }) => (
          <>
            <span
              className={`font-serif text-[17px] leading-none transition-colors duration-300 ${on ? "text-ink" : "text-ink-muted group-hover/f:text-ink"}`}
            >
              {numeral}
            </span>
            {/* The name opens to its width (0fr → 1fr) as its letters rise into place. */}
            <span
              className={`name-open grid ${on ? "grid-cols-[1fr]" : "grid-cols-[0fr]"}`}
            >
              <span className="overflow-hidden">
                <span
                  className={`name-text block pl-2 whitespace-nowrap ${TYPE} ${on ? "name-in" : "name-out"}`}
                >
                  {name}
                </span>
              </span>
            </span>
            {!on && (
              <span
                aria-hidden="true"
                className={`peek pointer-events-none absolute top-full left-1/2 whitespace-nowrap text-ink-muted ${TYPE}`}
              >
                {name}
              </span>
            )}
          </>
        ),
      })}
    </nav>
  );
}

/** The filters in the chosen direction. */
export function Filters() {
  const v = useVariant();
  if (v === "B") return <Senalador />;
  if (v === "C") return <Numeral />;
  return <Punto />;
}

const PAGES = [
  { to: "/autor", label: "Sobre el Autor" },
  { to: "/archivo", label: "Sobre el archivo" },
  { to: "/contacto", label: "Contacto" },
];

/** Round 1's small dropdown menu, kept as is so the header has its links; not in question this round. */
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
        className="fixed inset-auto top-14 right-4 m-0 w-64 bg-paper p-0 text-ink shadow-tapa lg:top-20 lg:right-16"
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
