// PROTOTYPE (#75), never merged: the Colecciones as on-screen filters, the centred Hélice, the book's words and the
// menu, each open question switched by its own query param so they combine. The options persist in sessionStorage, so
// they follow you to a Manual or info page. `?bar=0` hides the switcher bar.
import { type MouseEvent, useSyncExternalStore } from "react";
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

export const QUESTIONS = {
  /** How the three names are written. */
  names: ["corto", "completo", "numerales"],
  /** How the current filter is marked. */
  mark: ["raya", "punto", "tinta"],
  /** The filters on a phone. */
  phone: ["fila", "una-fila", "actual"],
  /** The book's words. */
  words: ["ninguna", "leyenda"],
  /** The menu. */
  menu: ["desplegable", "enlaces", "pie"],
} as const;

type Question = keyof typeof QUESTIONS;
export type Options = { [Q in Question]: (typeof QUESTIONS)[Q][number] } & {
  bar: boolean;
};

const DEFAULTS: Options = {
  names: "corto",
  mark: "raya",
  phone: "fila",
  words: "ninguna",
  menu: "desplegable",
  bar: true,
};
const KEY = "filters-prototype";

let options: Options = DEFAULTS;
const listeners = new Set<() => void>();
let read = false;

function load() {
  if (read) return;
  read = true;
  let stored: Partial<Options> = {};
  try {
    stored = JSON.parse(
      sessionStorage.getItem(KEY) ?? "{}",
    ) as Partial<Options>;
  } catch {
    // shortcut: storage blocked, start from the defaults.
  }
  const params = new URLSearchParams(location.search);
  const next = { ...DEFAULTS, ...stored };
  for (const q of Object.keys(QUESTIONS) as Question[]) {
    const value = params.get(q);
    if (value && (QUESTIONS[q] as readonly string[]).includes(value))
      (next as Record<string, unknown>)[q] = value;
  }
  if (params.has("bar")) next.bar = params.get("bar") !== "0";
  options = next;
}

function set(next: Options) {
  options = next;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // shortcut: storage blocked, the options last until the next full load.
  }
  const url = new URL(location.href);
  for (const q of Object.keys(QUESTIONS) as Question[])
    url.searchParams.set(q, next[q]);
  history.replaceState(history.state, "", url);
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The options in force; the prerendered page shows the defaults until hydrated. */
export function useOptions() {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return options;
    },
    () => DEFAULTS,
  );
}

/** The floating bar: each question's value, cycled by a click. Development only. */
export function Switcher() {
  const current = useOptions();
  if (!import.meta.env.DEV || !current.bar) return null;
  return (
    <div className="fixed bottom-3 left-1/2 z-50 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 flex-wrap justify-center gap-1 rounded-2xl bg-black/85 p-1 font-mono text-[11px] text-white shadow-lg">
      {(Object.keys(QUESTIONS) as Question[]).map((q) => (
        <button
          key={q}
          type="button"
          onClick={() => {
            const values = QUESTIONS[q] as readonly string[];
            const next =
              values[(values.indexOf(current[q]) + 1) % values.length];
            set({ ...current, [q]: next });
          }}
          className="rounded-xl px-2 py-1 hover:bg-white/15"
        >
          <span className="opacity-60">{q}=</span>
          {current[q]}
        </button>
      ))}
    </div>
  );
}

const SHORT: Record<ColeccionId, string> = {
  "estadistica-desde-cero": "Estadística",
  "ciencia-de-datos-desde-cero": "Ciencia de datos",
  "estadistica-aplicada": "Estadística aplicada",
};

/** A filter's click plays #70's change at once while the 3D is shown; otherwise it is a plain link. */
function useChange() {
  const navigate = useNavigate();
  return (
    event: MouseEvent<HTMLAnchorElement>,
    id: ColeccionId,
    path: string,
  ) => {
    const current = event.currentTarget.getAttribute("aria-current") === "page";
    const modified =
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (modified || !canMove() || (current && changingTo() === null)) return;
    event.preventDefault();
    prewarm(id);
    void changeColeccion(id, () => navigate(path));
  };
}

const SMALL_CAPS = "text-xs tracking-widest uppercase";
// The filters: sentence case, tracked in by 2% (Franco, 2026-11-20).
const FILTER_TYPE = "text-xs tracking-[-0.02em]";

/** The marks: how the current filter differs from the other two. */
function markClass(mark: Options["mark"], active: boolean) {
  if (!active) return "text-ink-muted hover:text-ink";
  if (mark === "tinta") return "text-ink font-semibold";
  return "text-ink";
}

interface LabelProps {
  id: ColeccionId;
  name: string;
  numeral: string;
  active: boolean;
  o: Options;
  /** Numerals only, whatever `names` says. */
  bare?: boolean;
}

function Label({ id, name, numeral, active, o, bare }: LabelProps) {
  const text = bare
    ? numeral
    : o.names === "corto"
      ? SHORT[id]
      : o.names === "completo"
        ? name
        : active
          ? `${numeral} · ${name}`
          : numeral;
  return (
    <span className="relative inline-flex items-center gap-2">
      {o.mark === "punto" && (
        <span
          aria-hidden="true"
          className={`size-1.5 shrink-0 rounded-full ${active ? "bg-ink" : "bg-transparent"}`}
        />
      )}
      <span>{text}</span>
      {o.mark === "raya" && active && (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 -bottom-1.5 h-px bg-ink"
        />
      )}
    </span>
  );
}

/**
 * The three Colecciones as filters, at the top centre of the Hélice pages: a navigation of three links, the current one
 * aria-current="page" (NavLink). The phone form follows `phone`; from lg up they sit in the header's row.
 */
export function Filters() {
  const o = useOptions();
  const colecciones = useColecciones();
  const change = useChange();

  const { pathname } = useLocation();
  const links = (className: string, labelOptions = o, bare = false) =>
    colecciones.map(({ id, name, numeral, path }) => (
      <NavLink
        key={path}
        to={path}
        aria-label={name}
        onClick={(event) => {
          change(event, id, path);
        }}
        className={({ isActive }) =>
          `outline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-ink ${className} ${markClass(o.mark, isActive)}`
        }
      >
        {({ isActive }) => (
          <Label
            id={id}
            name={name}
            numeral={numeral}
            active={isActive}
            o={labelOptions}
            bare={bare}
          />
        )}
      </NavLink>
    ));

  const current = colecciones.find(({ path }) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path),
  );
  // The written-out menu takes a row under the logo on a phone.
  const below = o.menu === "enlaces" ? "top-26" : "top-15";

  return (
    <>
      {/* Desktop: one row at the top centre, on the header's line. */}
      <nav
        aria-label="Colecciones"
        className={`fixed top-8 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-10 max-lg:hidden lg:flex ${FILTER_TYPE}`}
      >
        {links("inline-flex min-h-11 items-center whitespace-nowrap")}
      </nav>

      {/* Phone. */}
      {o.phone === "fila" && (
        <nav
          aria-label="Colecciones"
          className={`fixed inset-x-0 ${below} z-20 px-4 ${o.names === "numerales" ? "flex justify-center gap-8" : "grid grid-cols-3 gap-2"} text-center leading-tight ${FILTER_TYPE} lg:hidden`}
        >
          {links("flex min-h-11 items-center justify-center text-balance")}
        </nav>
      )}
      {o.phone === "una-fila" && (
        <div className="fixed top-3 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center lg:hidden">
          <nav aria-label="Colecciones" className={`flex gap-1 ${FILTER_TYPE}`}>
            {/* The row holds numerals only; the current name sits under it. */}
            {links(
              "inline-flex min-h-11 min-w-11 items-center justify-center",
              o,
              true,
            )}
          </nav>
        </div>
      )}
      {o.phone === "una-fila" && current && (
        <p
          aria-hidden="true"
          className={`fixed inset-x-0 top-14 z-20 text-center text-ink ${FILTER_TYPE} lg:hidden`}
        >
          {current.name}
        </p>
      )}
      {o.phone === "actual" && current && (
        <details
          className={`group/actual fixed inset-x-0 ${below} z-20 flex flex-col items-center px-4 lg:hidden`}
        >
          <summary
            className={`mx-auto flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 ${FILTER_TYPE} [&::-webkit-details-marker]:hidden`}
          >
            <span className="sr-only">Colección: </span>
            {current.numeral} · {current.name}
            <span
              aria-hidden="true"
              className="text-ink-muted group-open/actual:rotate-180"
            >
              ▾
            </span>
          </summary>
          <nav
            aria-label="Colecciones"
            className={`mx-auto mt-1 flex w-fit flex-col items-center rounded-sm bg-paper px-6 py-2 shadow-tapa ${FILTER_TYPE}`}
          >
            {links("inline-flex min-h-11 items-center", {
              ...o,
              names: "completo",
            })}
          </nav>
        </details>
      )}
    </>
  );
}

const PAGES = [
  { to: "/autor", label: "Sobre el Autor", short: "Autor" },
  { to: "/archivo", label: "Sobre el archivo", short: "Archivo" },
  { to: "/contacto", label: "Contacto", short: "Contacto" },
];

function License() {
  return (
    <>
      <a
        href={LICENSE_URL}
        className="underline decoration-rule underline-offset-2 hover:decoration-ink"
      >
        CC BY-NC-SA 4.0
      </a>{" "}
      · © Raúl E. Paz Zanini
    </>
  );
}

/** The menu at the header's right, in the picked form; `pie` leaves it empty (the foot line holds the links). */
export function ProtoMenu() {
  const o = useOptions();
  if (o.menu === "pie") return null;
  if (o.menu === "enlaces")
    return (
      <nav
        aria-label="El archivo"
        className="max-lg:order-last max-lg:basis-full"
      >
        <ul className={`flex gap-5 lg:gap-8 ${SMALL_CAPS}`}>
          {PAGES.map(({ to, label, short }) => (
            <li key={to}>
              <Link
                to={to}
                className="inline-flex min-h-11 items-center text-ink-muted outline-offset-4 hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
              >
                <span className="lg:hidden">{short}</span>
                <span className="max-lg:hidden">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    );
  // A small dropdown under its button, like A24's "Index ▾": a native popover, so a tap outside or Escape closes it.
  return (
    <>
      <button
        type="button"
        popoverTarget="indice"
        className={`inline-flex min-h-11 items-center gap-2 outline-offset-4 focus-visible:outline-2 focus-visible:outline-ink ${SMALL_CAPS} ${o.phone === "una-fila" ? "max-lg:min-w-11 max-lg:justify-center" : ""}`}
      >
        <span className={o.phone === "una-fila" ? "max-lg:sr-only" : ""}>
          Índice
        </span>
        <span
          aria-hidden="true"
          className={o.phone === "una-fila" ? "lg:hidden" : "hidden"}
        >
          <span className="block h-px w-5 bg-ink" />
          <span className="mt-1.5 block h-px w-5 bg-ink" />
        </span>
        <span
          aria-hidden="true"
          className={`text-ink-muted ${o.phone === "una-fila" ? "max-lg:hidden" : ""}`}
        >
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
          Todos los Manuales son gratuitos, con licencia <License />.
        </p>
      </div>
    </>
  );
}

/**
 * The foot line: with `pie`, the pages and the license; with `enlaces`, the license alone. Fixed at the bottom of a
 * Hélice page, at the end of the content elsewhere.
 */
export function ProtoFoot({ fixed = false }: { fixed?: boolean }) {
  const o = useOptions();
  if (o.menu === "desplegable") return null;
  return (
    <footer
      className={`flex flex-wrap items-center gap-x-6 gap-y-0 text-xs text-ink-muted ${fixed ? "pointer-events-none fixed inset-x-0 bottom-0 z-10 justify-start px-4 pb-3 *:pointer-events-auto lg:px-16 lg:pb-8" : "border-t border-rule py-4"}`}
    >
      {o.menu === "pie" && (
        <nav aria-label="El archivo">
          <ul className="flex gap-5">
            {PAGES.map(({ to, label, short }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="inline-flex min-h-11 items-center hover:text-ink"
                >
                  <span className="sm:hidden">{short}</span>
                  <span className="max-sm:hidden">{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <p className="inline-flex min-h-11 items-center">
        <License />
      </p>
    </footer>
  );
}
