/* eslint-disable -- PROTOTYPE (#58), throwaway: never merged. */
// PROTOTYPE (#58), never merged: three directions for the menu, each paired with an entrance and exit of the Hélice.
// `/?variant=A|B|C`; ←/→ or the floating bar switch; the bar also plays the entrance and the exit on demand.
// The Colección choice here only scrolls to the Colección's first book between the exit and the entrance: the real
// filter is #61.
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

import "./menu.css";
import {
  hideBooks,
  type IntroStyle,
  play,
  setIntroStyle,
  setRange,
} from "./intro";

interface Book {
  path: string;
  coleccion: string;
}

const VARIANTS = {
  A: {
    name: "Índice",
    motion: "la hélice se enrolla desde abajo",
    intro: "wind",
  },
  B: {
    name: "Margen",
    motion: "los libros llegan desde la niebla",
    intro: "fog",
  },
  C: { name: "Telón", motion: "la hélice gira y se abre", intro: "spin" },
} as const satisfies Record<
  string,
  { name: string; motion: string; intro: IntroStyle }
>;
type Variant = keyof typeof VARIANTS;
const KEYS = Object.keys(VARIANTS) as Variant[];

const PAGES = [
  { to: "/autor", label: "Sobre el Autor" },
  { to: "/archivo", label: "Sobre el archivo" },
  { to: "/contacto", label: "Contacto" },
];
const LICENSE =
  "Todos los Manuales son gratuitos, con licencia CC BY-NC-SA 4.0. © Raúl E. Paz Zanini.";
const TODAS = "Todas";

interface Coleccion {
  name: string;
  count: number;
  first: number;
}

function colecciones(books: Book[]): Coleccion[] {
  const list: Coleccion[] = [{ name: TODAS, count: books.length, first: 0 }];
  books.forEach((book, index) => {
    const found = list.find((c) => c.name === book.coleccion);
    if (found) found.count++;
    else list.push({ name: book.coleccion, count: 1, first: index });
  });
  return list;
}

const shown3d = () =>
  document.querySelector(".helice-3d[aria-busy=false]") !== null;

function scrollToStep(index: number) {
  document
    .querySelectorAll('ol[aria-label="Manuales"] > li')
    [index]?.scrollIntoView({ block: "center", behavior: "instant" });
}

/** The exit, the change, then the entrance; without the 3D, just the change. */
async function changeColeccion(coleccion: Coleccion) {
  const index = coleccion.first;
  const range: [number, number] | null =
    coleccion.name === TODAS
      ? null
      : [coleccion.first, coleccion.first + coleccion.count - 1];
  if (!shown3d()) {
    setRange(range);
    scrollToStep(index);
    return;
  }
  await play("exit");
  setRange(range);
  scrollToStep(index);
  await new Promise((resolve) => requestAnimationFrame(resolve));
  await play("enter");
}

/** The open/close state of a native modal dialog, with time for a closing animation before it really closes. */
function useDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<"closed" | "open" | "closing">("closed");
  useEffect(() => {
    document.documentElement.dataset.menu = state;
  }, [state]);
  return {
    ref,
    state,
    open: () => {
      ref.current?.showModal();
      setState("open");
    },
    close: () => {
      if (state !== "open") return;
      // Without motion there is no closing animation to wait for.
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
        ref.current?.close();
        setState("closed");
      } else setState("closing");
    },
    // The dialog's closing animation has ended: close it for real, which returns focus to the menu button.
    onAnimationEnd: (event: React.AnimationEvent) => {
      if (event.target !== event.currentTarget || state !== "closing") return;
      ref.current?.close();
      setState("closed");
    },
    onCancel: (event: React.SyntheticEvent) => {
      event.preventDefault();
      if (state !== "open") return;
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
        ref.current?.close();
        setState("closed");
      } else setState("closing");
    },
  };
}

interface MenuProps {
  colecciones: Coleccion[];
  current: string;
  onPick: (coleccion: Coleccion) => void;
}

/** A · Índice: a full-screen editorial index laid over the paper, its rules drawing in. */
function Indice({ colecciones, current, onPick }: MenuProps) {
  const dialog = useDialog();
  return (
    <>
      <button
        type="button"
        aria-expanded={dialog.state === "open"}
        onClick={dialog.open}
        className="menu-button fixed top-0 right-0 z-20 mx-4 mt-3 inline-flex min-h-11 items-center gap-3 text-xs tracking-widest uppercase lg:mx-16 lg:mt-8"
      >
        Índice
        <span className="h-px w-6 bg-ink" />
      </button>
      <dialog
        ref={dialog.ref}
        aria-label="Índice"
        data-state={dialog.state}
        onCancel={dialog.onCancel}
        onAnimationEnd={dialog.onAnimationEnd}
        className="indice m-0 h-dvh max-h-none w-full max-w-none bg-paper p-0 text-ink backdrop:bg-transparent"
      >
        <div className="flex min-h-full flex-col px-4 pt-3 pb-6 lg:px-16 lg:pt-8 lg:pb-10">
          <div className="flex items-center justify-between">
            <span className="inline-flex min-h-11 items-center font-serif text-base lg:text-lg">
              Raúl E. Paz Zanini
            </span>
            <button
              type="button"
              onClick={dialog.close}
              className="inline-flex min-h-11 items-center gap-3 text-xs tracking-widest uppercase"
            >
              Cerrar
              <span className="h-px w-6 rotate-45 bg-ink" />
            </button>
          </div>
          <div className="mt-10 grid flex-1 gap-12 lg:mt-20 lg:grid-cols-12 lg:gap-16">
            <section className="lg:col-span-7">
              <h2
                className="indice-row text-xs tracking-widest text-ink-muted uppercase"
                style={{ "--i": 0 } as React.CSSProperties}
              >
                Colecciones
              </h2>
              <ul className="mt-4">
                {colecciones.map((coleccion, i) => (
                  <li
                    key={coleccion.name}
                    className="indice-row border-t border-rule"
                    style={{ "--i": i + 1 } as React.CSSProperties}
                  >
                    <button
                      type="button"
                      aria-current={coleccion.name === current}
                      onClick={() => {
                        dialog.close();
                        onPick(coleccion);
                      }}
                      className="group grid min-h-14 w-full grid-cols-[2.5rem_1fr_auto] items-baseline gap-4 py-3 text-left lg:min-h-20 lg:py-5"
                    >
                      <span className="text-xs tracking-widest text-ink-muted uppercase">
                        {["", "I", "II", "III"][i] || "—"}
                      </span>
                      <span
                        className={`font-serif text-2xl leading-tight lg:text-4xl ${
                          coleccion.name === current
                            ? "text-ink"
                            : "text-ink-muted group-hover:text-ink"
                        } transition-colors`}
                      >
                        {coleccion.name}
                      </span>
                      <span className="text-xs text-ink-muted tabular-nums">
                        {coleccion.name === current ? "Estás acá · " : ""}
                        {coleccion.count} Manuales
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
            <section className="lg:col-span-4 lg:col-start-9">
              <h2
                className="indice-row text-xs tracking-widest text-ink-muted uppercase"
                style={{ "--i": 2 } as React.CSSProperties}
              >
                El archivo
              </h2>
              <ul className="mt-4">
                {PAGES.map((page, i) => (
                  <li
                    key={page.to}
                    className="indice-row border-t border-rule"
                    style={{ "--i": i + 3 } as React.CSSProperties}
                  >
                    <Link
                      to={page.to}
                      className="flex min-h-12 items-center font-serif text-lg lg:text-xl"
                    >
                      {page.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <p
            className="indice-row mt-12 max-w-md text-xs text-pretty text-ink-muted"
            style={{ "--i": 6 } as React.CSSProperties}
          >
            {LICENSE}
          </p>
        </div>
      </dialog>
    </>
  );
}

/** B · Margen: a quiet panel slides in from the right and the Hélice steps aside to make room. */
function Margen({ colecciones, current, onPick }: MenuProps) {
  const dialog = useDialog();
  return (
    <>
      <button
        type="button"
        aria-expanded={dialog.state === "open"}
        onClick={dialog.open}
        className="menu-button fixed top-0 right-0 z-20 mx-4 mt-3 inline-flex min-h-11 items-center gap-2 font-serif text-base lg:mx-16 lg:mt-8 lg:text-lg"
      >
        Menú
      </button>
      <dialog
        ref={dialog.ref}
        aria-label="Menú"
        data-state={dialog.state}
        onCancel={dialog.onCancel}
        onAnimationEnd={dialog.onAnimationEnd}
        className="margen m-0 ml-auto h-dvh max-h-none w-[min(24rem,100vw)] max-w-none border-l border-rule bg-paper p-0 text-ink backdrop:bg-paper/30"
      >
        <div className="flex min-h-full flex-col px-6 pt-3 pb-6 lg:px-10 lg:pt-8 lg:pb-10">
          <button
            type="button"
            onClick={dialog.close}
            className="inline-flex min-h-11 items-center self-end font-serif text-base lg:text-lg"
          >
            Cerrar
          </button>
          <p
            className="margen-item mt-10 text-xs tracking-widest text-ink-muted uppercase"
            style={{ "--i": 0 } as React.CSSProperties}
          >
            Colecciones
          </p>
          <ul className="mt-3">
            {colecciones.map((coleccion, i) => (
              <li
                key={coleccion.name}
                className="margen-item"
                style={{ "--i": i + 1 } as React.CSSProperties}
              >
                <button
                  type="button"
                  aria-current={coleccion.name === current}
                  onClick={() => {
                    dialog.close();
                    onPick(coleccion);
                  }}
                  className="flex min-h-11 w-full items-baseline gap-3 text-left"
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 translate-y-[-0.15em] rounded-full ${
                      coleccion.name === current ? "bg-ink" : "bg-transparent"
                    }`}
                  />
                  <span className="flex-1 font-serif text-xl">
                    {coleccion.name}
                  </span>
                  <span className="text-xs text-ink-muted tabular-nums">
                    {coleccion.count}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p
            className="margen-item mt-10 text-xs tracking-widest text-ink-muted uppercase"
            style={{ "--i": 6 } as React.CSSProperties}
          >
            El archivo
          </p>
          <ul className="mt-3">
            {PAGES.map((page, i) => (
              <li
                key={page.to}
                className="margen-item"
                style={{ "--i": i + 7 } as React.CSSProperties}
              >
                <Link
                  to={page.to}
                  className="flex min-h-11 items-center pl-4.5 font-serif text-xl"
                >
                  {page.label}
                </Link>
              </li>
            ))}
          </ul>
          <p
            className="margen-item mt-auto pt-10 text-xs text-pretty text-ink-muted"
            style={{ "--i": 10 } as React.CSSProperties}
          >
            {LICENSE}
          </p>
        </div>
      </dialog>
    </>
  );
}

/** C · Telón: an ink curtain falls over the Hélice, which dims and draws back behind it. */
function Telon({ colecciones, current, onPick }: MenuProps) {
  const dialog = useDialog();
  return (
    <>
      <button
        type="button"
        aria-expanded={dialog.state === "open"}
        onClick={dialog.open}
        className="menu-button fixed top-0 right-0 z-20 mx-4 mt-3 inline-flex min-h-11 items-center gap-2.5 text-xs tracking-widest uppercase lg:mx-16 lg:mt-8"
      >
        <span className="h-2 w-2 rounded-full bg-ink" />
        Menú
      </button>
      <dialog
        ref={dialog.ref}
        aria-label="Menú"
        data-state={dialog.state}
        onCancel={dialog.onCancel}
        onAnimationEnd={dialog.onAnimationEnd}
        className="telon m-0 h-dvh max-h-none w-full max-w-none bg-ink p-0 text-paper backdrop:bg-transparent"
      >
        <div className="telon-content flex min-h-full flex-col px-4 pt-3 pb-6 lg:px-16 lg:pt-8 lg:pb-10">
          <button
            type="button"
            onClick={dialog.close}
            className="inline-flex min-h-11 items-center gap-2.5 self-end text-xs tracking-widest uppercase"
          >
            <span className="h-2 w-2 rounded-full border border-paper" />
            Cerrar
          </button>
          <div className="flex flex-1 flex-col justify-center gap-14 py-10 lg:items-center lg:text-center">
            <ul className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:justify-center lg:gap-x-12 lg:gap-y-4">
              {colecciones.map((coleccion) => (
                <li key={coleccion.name}>
                  <button
                    type="button"
                    aria-current={coleccion.name === current}
                    onClick={() => {
                      dialog.close();
                      onPick(coleccion);
                    }}
                    className={`inline-flex min-h-12 items-start gap-1.5 font-serif text-2xl transition-opacity lg:text-4xl ${
                      coleccion.name === current
                        ? "underline decoration-1 underline-offset-8"
                        : "opacity-55 hover:opacity-100"
                    }`}
                  >
                    {coleccion.name}
                    <sup className="pt-1 font-sans text-[0.625rem] tracking-widest tabular-nums lg:pt-2">
                      {coleccion.count}
                    </sup>
                  </button>
                </li>
              ))}
            </ul>
            <ul className="flex flex-col gap-1 lg:flex-row lg:gap-10">
              {PAGES.map((page) => (
                <li key={page.to}>
                  <Link
                    to={page.to}
                    className="inline-flex min-h-11 items-center text-xs tracking-widest uppercase opacity-80 hover:opacity-100"
                  >
                    {page.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-pretty opacity-60 lg:text-center">
            {LICENSE}
          </p>
        </div>
      </dialog>
    </>
  );
}

const MENUS = { A: Indice, B: Margen, C: Telon };

interface Props {
  books: Book[];
}

export function MenuPrototype({ books }: Props) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const raw = params.get("variant");
  const variant: Variant = raw && raw in VARIANTS ? (raw as Variant) : "A";
  const [current, setCurrent] = useState(TODAS);
  const list = colecciones(books);

  // The entrance, once the 3D Hélice has faded in (and the first-visit cover lifts with it).
  useEffect(() => {
    setIntroStyle(VARIANTS[variant].intro);
    hideBooks();
    let entered = false;
    const timer = setInterval(() => {
      if (!entered && shown3d()) {
        entered = true;
        clearInterval(timer);
        void play("enter");
      }
    }, 50);
    return () => {
      clearInterval(timer);
    };
  }, [variant]);

  // ←/→ switch variants.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (document.documentElement.dataset.menu === "open") return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const next =
        KEYS[
          (KEYS.indexOf(variant) +
            (event.key === "ArrowRight" ? 1 : KEYS.length - 1)) %
            KEYS.length
        ];
      void navigate(`/?variant=${next}`, { replace: true });
    };
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
    };
  }, [variant, navigate]);

  const Menu = MENUS[variant];
  return (
    <>
      <Menu
        key={variant}
        colecciones={list}
        current={current}
        onPick={(coleccion) => {
          if (coleccion.name === current) return;
          setCurrent(coleccion.name);
          void changeColeccion(coleccion);
        }}
      />
      {import.meta.env.DEV && (
        <nav
          aria-label="Variantes del prototipo"
          className="fixed bottom-3 left-1/2 z-50 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full bg-black/85 px-1.5 py-1 font-mono text-[0.625rem] whitespace-nowrap text-white shadow-lg"
        >
          {KEYS.map((key) => (
            <Link
              key={key}
              to={`/?variant=${key}`}
              replace
              className={`rounded-full px-2 py-1 ${key === variant ? "bg-white text-black" : ""}`}
            >
              {key} · {VARIANTS[key].name}
            </Link>
          ))}
          <span className="mx-1 h-4 w-px bg-white/30" />
          <button
            type="button"
            className="rounded-full px-2 py-1 hover:bg-white/20"
            onClick={() => void play("enter")}
          >
            Entrada
          </button>
          <button
            type="button"
            className="rounded-full px-2 py-1 hover:bg-white/20"
            onClick={() => void play("exit").then(() => play("enter"))}
          >
            Salida → entrada
          </button>
        </nav>
      )}
    </>
  );
}
