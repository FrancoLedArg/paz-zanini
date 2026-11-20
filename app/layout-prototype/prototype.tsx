/* eslint-disable -- PROTOTYPE (#67), throwaway: never merged. */
// PROTOTYPE (#67), never merged: the layout with one Hélice per Colección, in three directions.
// `/?variant=A|B|C`, plus `&coleccion=<id>` for Colección II or III (none is Colección I, as `/` will be). The param
// stands in for the real routes (#68). ←/→ or the floating bar switch variants; `&bar=0` hides the bar.
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

import type { ColeccionId } from "../catalog/catalog";
import { useColecciones } from "../shared/coleccion";
import { LICENSE_URL } from "../shared/license";
import { reducedMotion } from "../shared/motion";
import { stepInView } from "../shared/track";
import { hideBooks, type IntroStyle, play, setIntroStyle } from "./intro";
import "./prototype.css";

export const COLECCION_I: ColeccionId = "estadistica-desde-cero";

/** The Colección on screen: the param, or Colección I. Read on the server too (dev SSR), so the first paint matches. */
export function usePrototypeColeccion(): ColeccionId {
  const [params] = useSearchParams();
  const ids = useColecciones().map(({ id }) => id);
  const id = params.get("coleccion");
  return (ids.find((known) => known === id) ?? COLECCION_I) as ColeccionId;
}

interface Book {
  path: string;
  title: string;
  number: string;
  color: string;
  details: string;
}

const VARIANTS = {
  A: { name: "Rótulo", intro: "rise" },
  B: { name: "Pestañas", intro: "rise" },
  C: { name: "Pliegos", intro: "slide" },
} as const satisfies Record<string, { name: string; intro: IntroStyle }>;
type Variant = keyof typeof VARIANTS;
const KEYS = Object.keys(VARIANTS) as Variant[];

const NUMERALS = ["I", "II", "III"];
const PAGES = [
  { to: "/autor", label: "Sobre el Autor" },
  { to: "/archivo", label: "Sobre el archivo" },
  { to: "/contacto", label: "Contacto" },
];
const SMALL_CAPS = "text-xs tracking-widest uppercase";
const BUTTON = `inline-flex min-h-11 items-center gap-3 outline-offset-4 focus-visible:outline-2 focus-visible:outline-ink ${SMALL_CAPS}`;
const pad = (n: number) => String(n).padStart(2, "0");
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const shown3d = () =>
  document.querySelector(".helice-3d[aria-busy=false]") !== null;
const track = () =>
  document.querySelector<HTMLElement>('ol[aria-label="Manuales"]');

function urlFor(variant: Variant, id: ColeccionId, bar: boolean) {
  const params = new URLSearchParams({ variant });
  if (id !== COLECCION_I) params.set("coleccion", id);
  if (!bar) params.set("bar", "0");
  return `/?${params}`;
}

interface Coleccion {
  id: ColeccionId;
  name: string;
  count: number;
}

// ---------------------------------------------------------------------------------------------------------------------
// The host: the Colección change, the entrance on first load, the bar.

interface Props {
  books: Book[];
  coleccion: ColeccionId;
}

export function Prototype({ books, coleccion }: Props) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const raw = params.get("variant");
  const variant: Variant = raw && raw in VARIANTS ? (raw as Variant) : "A";
  const bar = params.get("bar") !== "0";
  const colecciones = useColecciones() as Coleccion[];
  const index = colecciones.findIndex(({ id }) => id === coleccion);
  const current = colecciones[index] ?? colecciones[0]!;

  // A change this host started plays its own entrance; any other (Back, Forward) gets an entrance alone.
  const changing = useRef(false);
  const shownIndex = useRef(index);
  useEffect(() => {
    if (shownIndex.current === index) return;
    const side = index > shownIndex.current ? 1 : -1;
    shownIndex.current = index;
    if (!changing.current && shown3d()) void play("enter", side);
  }, [index]);

  // The entrance on first load, once the 3D Hélice has faded in (and the first-visit cover lifts with it).
  useLayoutEffect(() => {
    setIntroStyle(VARIANTS[variant].intro);
    if (reducedMotion()) return;
    hideBooks();
    const started = performance.now();
    const timer = setInterval(() => {
      if (shown3d()) {
        clearInterval(timer);
        void play("enter", 1);
      } else if (performance.now() - started > 9000) {
        // No 3D (no WebGL): nothing to bring in, so the words come back.
        clearInterval(timer);
        delete document.documentElement.dataset.intro;
      }
    }, 50);
    return () => {
      clearInterval(timer);
    };
  }, [variant]);

  /** The exit, the new page, then the entrance; without the 3D, just the new page. */
  const change = async (id: ColeccionId) => {
    const to = colecciones.findIndex((c) => c.id === id);
    if (to === index || changing.current) return;
    const side = to > index ? 1 : -1;
    const url = urlFor(variant, id, bar);
    if (!shown3d()) {
      void navigate(url);
      return;
    }
    changing.current = true;
    await play("exit", -side);
    await navigate(url);
    scrollTo({ top: 0, behavior: "instant" });
    await frame();
    await frame();
    await play("enter", side);
    changing.current = false;
  };

  // ←/→ switch variants.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (document.querySelector("dialog[open]")) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const next =
        KEYS[
          (KEYS.indexOf(variant) +
            (event.key === "ArrowRight" ? 1 : KEYS.length - 1)) %
            KEYS.length
        ]!;
      void navigate(urlFor(next, coleccion, bar), { replace: true });
    };
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
    };
  }, [variant, coleccion, bar, navigate]);

  const shared = { colecciones, current, index, change };
  return (
    <div data-variant={variant}>
      {variant === "A" && <VariantA {...shared} books={books} />}
      {variant === "B" && <VariantB {...shared} books={books} />}
      {variant === "C" && <VariantC {...shared} books={books} />}
      {bar && (
        <nav
          aria-label="Variantes del prototipo"
          className="fixed bottom-2 left-1/2 z-50 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full bg-black/85 px-1.5 py-1 font-mono text-[0.625rem] whitespace-nowrap text-white shadow-lg"
        >
          {KEYS.map((key) => (
            <Link
              key={key}
              to={urlFor(key, coleccion, bar)}
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
            onClick={() => void play("enter", 1)}
          >
            Entrada
          </button>
          <button
            type="button"
            className="rounded-full px-2 py-1 hover:bg-white/20"
            onClick={() =>
              void change(colecciones[(index + 1) % colecciones.length]!.id)
            }
          >
            Colección →
          </button>
        </nav>
      )}
    </div>
  );
}

interface VariantProps {
  books: Book[];
  colecciones: Coleccion[];
  current: Coleccion;
  index: number;
  change: (id: ColeccionId) => Promise<void>;
}

// ---------------------------------------------------------------------------------------------------------------------
// Shared pieces.

/**
 * The book in focus, read from the scroll on every scroll event: no rest timer. It writes `--s` (steps down the track),
 * `--p` (0 to 1 along it) and `--near` (1 on a step, 0 a quarter step or more away) on the element, so the words move
 * with the scroll in CSS, and re-renders only when the nearest step changes.
 */
function useFocus(n: number) {
  const ref = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  useLayoutEffect(() => {
    const update = () => {
      const el = ref.current;
      const t = track();
      if (!el || !t) return;
      const s = stepInView(t);
      const i = Math.round(s);
      const near = Math.max(0, 1 - Math.abs(s - i) / 0.22);
      el.style.setProperty("--s", String(s));
      el.style.setProperty("--p", String(n > 1 ? s / (n - 1) : 0));
      el.style.setProperty("--near", String(near * near * (3 - 2 * near)));
      setStep(i);
    };
    update();
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    return () => {
      removeEventListener("scroll", update);
      removeEventListener("resize", update);
    };
  }, [n]);
  return { ref, step };
}

/** Where the words sit: bottom left on a wide screen, along the bottom on a narrow one. */
const WORDS =
  "pointer-events-none fixed inset-x-0 bottom-0 z-10 bg-linear-to-t from-paper from-60% px-4 pt-14 pb-12 wide:inset-x-auto wide:bottom-12 wide:left-16 wide:w-[30vw] wide:max-w-88 wide:bg-none wide:p-0";

function TitleLink({ book, style }: { book: Book; style?: CSSProperties }) {
  return (
    <p
      className="mt-1 font-serif text-xl leading-tight text-balance lg:mt-2 lg:text-2xl"
      style={style}
    >
      <Link
        to={book.path}
        className="pointer-events-auto inline-flex min-h-11 items-center outline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ink"
      >
        {book.title}
      </Link>
    </p>
  );
}

function Logo() {
  return (
    <Link
      to="/"
      className="pointer-events-auto inline-flex min-h-11 items-center font-serif text-base tracking-tight outline-offset-4 focus-visible:outline-2 focus-visible:outline-ink lg:text-lg"
    >
      Raúl E. Paz Zanini
    </Link>
  );
}

function Bar({ children }: { children: ReactNode }) {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-start justify-between gap-4 px-4 pt-3 lg:px-16 lg:pt-8">
      {children}
    </header>
  );
}

function License() {
  return (
    <>
      Todos los Manuales son gratuitos, con licencia{" "}
      <a
        href={LICENSE_URL}
        className="underline decoration-rule underline-offset-2 hover:decoration-ink"
      >
        CC BY-NC-SA 4.0
      </a>
      . © Raúl E. Paz Zanini.
    </>
  );
}

/** A native modal dialog with time for its closing animation. */
function useDialog(name: string) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<"closed" | "open" | "closing">("closed");
  useEffect(() => {
    document.documentElement.dataset.menu = state;
    document.documentElement.dataset.menuName = name;
  }, [state, name]);
  const close = () =>
    new Promise<void>((resolve) => {
      if (!ref.current?.open) return resolve();
      if (reducedMotion()) {
        ref.current.close();
        setState("closed");
        return resolve();
      }
      setState("closing");
      // The closing animation's length, plus a frame.
      setTimeout(resolve, 480);
    });
  return {
    ref,
    state,
    open: () => {
      ref.current?.showModal();
      setState("open");
    },
    close,
    props: {
      ref,
      "data-state": state,
      onCancel: (event: React.SyntheticEvent) => {
        event.preventDefault();
        void close();
      },
      onAnimationEnd: (event: React.AnimationEvent) => {
        if (event.target !== event.currentTarget || state !== "closing") return;
        ref.current?.close();
        setState("closed");
      },
    },
  };
}

function MenuButton({
  label,
  expanded,
  onClick,
}: {
  label: string;
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-haspopup="dialog"
      onClick={onClick}
      className={`pointer-events-auto ${BUTTON}`}
    >
      {label}
      <span aria-hidden="true" className="h-px w-6 bg-ink" />
    </button>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={BUTTON}>
      Cerrar
      <span aria-hidden="true" className="h-px w-6 rotate-45 bg-ink" />
    </button>
  );
}

const rowDelay = (i: number): CSSProperties => ({
  animationDelay: `${250 + i * 60}ms`,
});

function Row({ i, children }: { i: number; children: ReactNode }) {
  return (
    <li className="proto-row relative" style={rowDelay(i)}>
      <span
        aria-hidden="true"
        className="proto-rule absolute inset-x-0 top-0 h-px origin-left bg-rule"
        style={rowDelay(i)}
      />
      {children}
    </li>
  );
}

function PageLinks({ from, size }: { from: number; size: string }) {
  return (
    <ul className="mt-4">
      {PAGES.map(({ to, label }, i) => (
        <Row key={to} i={from + i}>
          <Link
            to={to}
            className={`flex min-h-12 items-center font-serif outline-offset-2 focus-visible:outline-2 focus-visible:outline-ink ${size}`}
          >
            {label}
          </Link>
        </Row>
      ))}
    </ul>
  );
}

function ColeccionRows({
  colecciones,
  current,
  onPick,
  big,
}: {
  colecciones: Coleccion[];
  current: Coleccion;
  onPick: (id: ColeccionId) => void;
  big: boolean;
}) {
  return (
    <ul className="mt-4">
      {colecciones.map(({ id, name, count }, i) => {
        const here = id === current.id;
        return (
          <Row key={id} i={i + 1}>
            <button
              type="button"
              aria-current={here ? "page" : undefined}
              onClick={() => {
                onPick(id);
              }}
              className={`grid w-full grid-cols-[2.5rem_1fr_auto] items-baseline gap-4 py-3 text-left outline-offset-2 transition-colors focus-visible:outline-2 focus-visible:outline-ink ${big ? "min-h-14 lg:min-h-20 lg:py-5" : "min-h-14"} ${here ? "text-ink" : "text-ink-muted hover:text-ink"}`}
            >
              <span aria-hidden="true" className={SMALL_CAPS}>
                {NUMERALS[i]}
              </span>
              <span
                className={`font-serif leading-tight ${big ? "text-2xl lg:text-4xl" : "text-2xl"}`}
              >
                {name}
              </span>
              <span className="text-xs tabular-nums">
                {here && "Estás acá · "}
                {count}
              </span>
            </button>
          </Row>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// A · Rótulo: the Índice as today, closing before the change; the Colección as a running head over the words; the
// number rolls like an odometer with the scroll and the title surfaces from a blur as the book comes to rest.

function VariantA({
  books,
  colecciones,
  current,
  index,
  change,
}: VariantProps) {
  const dialog = useDialog("indice");
  const { ref, step } = useFocus(books.length);
  const book = books[Math.min(step, books.length - 1)];
  return (
    <>
      <Bar>
        <Logo />
        <MenuButton
          label="Índice"
          expanded={dialog.state === "open"}
          onClick={dialog.open}
        />
      </Bar>
      <dialog
        {...dialog.props}
        aria-label="Índice"
        className="proto-indice m-0 h-dvh max-h-none w-full max-w-none bg-paper p-0 text-ink backdrop:bg-transparent"
      >
        <div className="flex min-h-full flex-col px-4 pt-3 pb-6 lg:px-16 lg:pt-8 lg:pb-10">
          <div className="flex items-start justify-between">
            <span className="inline-flex min-h-11 items-center font-serif text-base tracking-tight lg:text-lg">
              Raúl E. Paz Zanini
            </span>
            <CloseButton onClick={() => void dialog.close()} />
          </div>
          <div className="mt-10 grid flex-1 content-start gap-12 lg:mt-20 lg:grid-cols-12 lg:gap-16">
            <nav aria-label="Colecciones" className="lg:col-span-7">
              <h2
                className={`proto-row text-ink-muted ${SMALL_CAPS}`}
                style={rowDelay(0)}
              >
                Colecciones
              </h2>
              <ColeccionRows
                big
                colecciones={colecciones}
                current={current}
                onPick={(id) => {
                  // The sheet rolls up first, so the whole change plays in view.
                  void dialog.close().then(() => change(id));
                }}
              />
            </nav>
            <nav
              aria-label="El archivo"
              className="lg:col-span-4 lg:col-start-9"
            >
              <h2
                className={`proto-row text-ink-muted ${SMALL_CAPS}`}
                style={rowDelay(1)}
              >
                El archivo
              </h2>
              <PageLinks from={2} size="text-lg lg:text-xl" />
            </nav>
          </div>
          <p
            className="proto-row mt-12 max-w-md text-xs text-pretty text-ink-muted"
            style={rowDelay(6)}
          >
            <License />
          </p>
        </div>
      </dialog>
      <section ref={ref} aria-label="Manual en foco" className={WORDS}>
        <p
          key={current.id}
          className={`text-ink motion-safe:animate-rise-in ${SMALL_CAPS}`}
        >
          {NUMERALS[index]} · {current.name}
        </p>
        {book && (
          <div className="proto-intro-hide mt-3">
            <p className="flex items-baseline gap-2">
              {/* Every number in a column, rolled by the scroll: it never names a book before the book arrives. */}
              <span className="inline-block h-[1em] overflow-hidden font-serif text-4xl leading-none font-light lg:text-5xl">
                <span
                  className="block"
                  style={{ transform: "translateY(calc(var(--s, 0) * -1em))" }}
                >
                  {books.map((b) => (
                    <span
                      key={b.path}
                      className="block h-[1em]"
                      style={{ color: b.color }}
                    >
                      {b.number}
                    </span>
                  ))}
                </span>
              </span>
              <span className="text-xs text-ink-muted tabular-nums">
                / {pad(books.length)}
              </span>
            </p>
            <TitleLink
              book={book}
              style={{
                opacity: "var(--near, 1)",
                transform: "translateY(calc((1 - var(--near, 1)) * 0.6rem))",
                filter: "blur(calc((1 - var(--near, 1)) * 5px))",
              }}
            />
            <p
              className="text-xs text-ink-muted"
              style={{ opacity: "var(--near, 1)" }}
            >
              {book.details}
            </p>
          </div>
        )}
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// B · Pestañas: the Colecciones leave the menu and stay on screen, so the current one is always named and a change
// needs no menu at all; the Índice keeps only the pages and the license. A hairline fills with the scroll; the title is
// uncovered from the left as the book comes to rest.

function VariantB({
  books,
  colecciones,
  current,
  index,
  change,
}: VariantProps) {
  const dialog = useDialog("indice-b");
  const { ref, step } = useFocus(books.length);
  const book = books[Math.min(step, books.length - 1)];
  return (
    <>
      <Bar>
        <Logo />
        <MenuButton
          label="Índice"
          expanded={dialog.state === "open"}
          onClick={dialog.open}
        />
      </Bar>
      {/* Desktop: down the left margin. Phone: one row under the logo, the current Colección spelled out. */}
      <nav
        aria-label="Colecciones"
        className="fixed inset-x-0 top-14 z-20 px-4 wide:inset-x-auto wide:top-1/2 wide:left-16 wide:-translate-y-1/2 wide:px-0"
      >
        <ul className="flex items-baseline gap-1 wide:flex-col wide:items-start wide:gap-0">
          {colecciones.map(({ id, name, count }, i) => {
            const here = id === current.id;
            return (
              <li key={id}>
                <button
                  type="button"
                  aria-current={here ? "page" : undefined}
                  onClick={() => void change(id)}
                  className={`group flex min-h-11 items-baseline gap-3 pr-3 text-left outline-offset-2 focus-visible:outline-2 focus-visible:outline-ink wide:py-1 ${here ? "text-ink" : "text-ink-muted hover:text-ink"}`}
                >
                  <span
                    aria-hidden="true"
                    className={`hidden h-px self-center bg-ink transition-[width] duration-500 ease-settle wide:block ${here ? "w-6" : "w-0 group-hover:w-3"}`}
                  />
                  <span className={SMALL_CAPS}>{NUMERALS[i]}</span>
                  <span
                    className={`font-serif text-base leading-tight wide:text-lg ${here ? "" : "sr-only wide:not-sr-only"}`}
                  >
                    {name}
                  </span>
                  <span
                    className={`hidden text-xs tabular-nums wide:inline ${here ? "text-ink-muted" : "opacity-0 group-hover:opacity-100"}`}
                  >
                    {count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      {/* A small sheet under the button: the Colecciones aren't in it, so it needn't cover the Hélice. */}
      <dialog
        {...dialog.props}
        aria-label="Índice"
        className="proto-indice fixed inset-auto top-0 right-0 m-0 w-full max-w-none bg-paper p-0 text-ink shadow-[0_24px_60px_-30px_oklch(0.2_0.02_85/0.35)] backdrop:bg-transparent wide:w-[26rem]"
      >
        <div className="px-4 pt-3 pb-6 lg:px-10 lg:pt-8 lg:pb-8">
          <div className="flex justify-end">
            <CloseButton onClick={() => void dialog.close()} />
          </div>
          <nav aria-label="El archivo" className="mt-6">
            <h2
              className={`proto-row text-ink-muted ${SMALL_CAPS}`}
              style={rowDelay(0)}
            >
              El archivo
            </h2>
            <PageLinks from={1} size="text-xl lg:text-2xl" />
          </nav>
          <p
            className="proto-row mt-8 text-xs text-pretty text-ink-muted"
            style={rowDelay(5)}
          >
            <License />
          </p>
        </div>
      </dialog>
      <section ref={ref} aria-label="Manual en foco" className={WORDS}>
        {book && (
          <div className="proto-intro-hide">
            <p className="flex items-center gap-3">
              <span
                className="font-serif text-4xl leading-none font-light tabular-nums lg:text-5xl"
                style={{
                  color: book.color,
                  opacity: "calc(0.3 + 0.7 * var(--near, 1))",
                }}
              >
                {book.number}
              </span>
              <span className="relative h-px w-20 bg-rule lg:w-28">
                <span
                  className="absolute inset-y-0 left-0 bg-ink"
                  style={{ width: "calc(var(--p, 0) * 100%)" }}
                />
              </span>
              <span className="text-xs text-ink-muted tabular-nums">
                {pad(books.length)}
              </span>
            </p>
            <TitleLink
              book={book}
              style={{
                clipPath:
                  "inset(-0.2em calc((1 - var(--near, 1)) * 100%) -0.2em 0)",
              }}
            />
            <p
              className="text-xs text-ink-muted"
              style={{ opacity: "var(--near, 1)" }}
            >
              {book.details}
            </p>
          </div>
        )}
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// C · Pliegos: the Colecciones are pages side by side. The Índice is a side panel (a bottom sheet on a phone) and the
// Hélice steps aside for it, so a change plays in view while the panel stays open: the books slide off one way and the
// next Colección's slide in from the other, then the panel closes. The Colección's name is the words' running title; a
// ruler of one tick per book carries a marker with the scroll; the title's letters close up as the book comes to rest.

function VariantC({
  books,
  colecciones,
  current,
  index,
  change,
}: VariantProps) {
  const dialog = useDialog("pliegos");
  const { ref, step } = useFocus(books.length);
  const book = books[Math.min(step, books.length - 1)];
  return (
    <>
      <Bar>
        <Logo />
        <MenuButton
          label="Índice"
          expanded={dialog.state === "open"}
          onClick={dialog.open}
        />
      </Bar>
      <dialog
        {...dialog.props}
        aria-label="Índice"
        className="proto-pliegos fixed inset-auto right-0 bottom-0 m-0 h-[46dvh] max-h-none w-full max-w-none overflow-y-auto border-t border-rule bg-paper p-0 text-ink backdrop:bg-transparent wide:top-0 wide:h-dvh wide:w-[30rem] wide:border-t-0 wide:border-l"
      >
        <div className="flex min-h-full flex-col px-4 pt-3 pb-6 lg:px-10 lg:pt-8 lg:pb-10">
          <div className="flex justify-end">
            <CloseButton onClick={() => void dialog.close()} />
          </div>
          <nav aria-label="Colecciones" className="mt-2 lg:mt-10">
            <h2
              className={`proto-row text-ink-muted ${SMALL_CAPS}`}
              style={rowDelay(0)}
            >
              Colecciones
            </h2>
            <ColeccionRows
              big={false}
              colecciones={colecciones}
              current={current}
              onPick={(id) => {
                // The panel stays open while the books change beside it, then steps away.
                void change(id)
                  .then(() => wait(250))
                  .then(() => dialog.close());
              }}
            />
          </nav>
          <nav aria-label="El archivo" className="mt-10">
            <h2
              className={`proto-row text-ink-muted ${SMALL_CAPS}`}
              style={rowDelay(4)}
            >
              El archivo
            </h2>
            <PageLinks from={5} size="text-lg" />
          </nav>
          <p
            className="proto-row mt-10 text-xs text-pretty text-ink-muted"
            style={rowDelay(8)}
          >
            <License />
          </p>
        </div>
      </dialog>
      <section ref={ref} aria-label="Manual en foco" className={WORDS}>
        <div key={current.id} className="motion-safe:animate-rise-in">
          <p className={`text-ink-muted ${SMALL_CAPS}`}>
            Colección {NUMERALS[index]} de III
          </p>
          <p className="mt-1 font-serif text-2xl leading-tight text-balance">
            {current.name}
          </p>
        </div>
        {book && (
          <div className="proto-intro-hide mt-5">
            <div className="flex items-center gap-4">
              <span
                className="w-8 font-serif text-2xl leading-none font-light tabular-nums"
                style={{
                  color: book.color,
                  opacity: "calc(0.25 + 0.75 * var(--near, 1))",
                }}
              >
                {book.number}
              </span>
              <span className="relative flex h-3 w-36 justify-between lg:w-44">
                {books.map((b) => (
                  <span key={b.path} className="h-full w-px bg-rule" />
                ))}
                <span
                  className="absolute -top-1 -bottom-1 w-0.5 bg-ink"
                  style={{ left: "calc(var(--p, 0) * (100% - 2px))" }}
                />
              </span>
            </div>
            <TitleLink
              book={book}
              style={{
                opacity: "var(--near, 1)",
                letterSpacing: "calc((1 - var(--near, 1)) * 0.2em)",
              }}
            />
            <p
              className="text-xs text-ink-muted"
              style={{ opacity: "var(--near, 1)" }}
            >
              {book.details}
            </p>
          </div>
        )}
      </section>
    </>
  );
}
