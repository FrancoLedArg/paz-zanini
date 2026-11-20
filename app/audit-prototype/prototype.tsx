// PROTOTYPE (#77), never merged: the audit's ideas on the real pages. Plan: six query params, one per idea, combinable;
// the first option of each is today's site; the bar at the bottom cycles each (development only, `?bar=0` hides it).
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useHydrated } from "../shared/hydrated";
import {
  type Idea,
  IDEA_KEYS,
  IDEAS,
  choose,
  useIdea,
  useIdeas,
} from "./ideas";
import { startFlick, useRest } from "./settle";
import "./prototype.css";

export { useIdea, ideaNow } from "./ideas";

/** Mounted once in the root: the grain, the pencil's filter, the flick controller and the bar. */
export function AuditPrototype() {
  const ideas = useIdeas();
  const hydrated = useHydrated();
  useEffect(() => {
    return ideas.giro === "peso" ? startFlick() : undefined;
  }, [ideas.giro]);
  return (
    <>
      <div aria-hidden="true" className="proto-grain" />
      <svg aria-hidden="true" width="0" height="0" className="absolute">
        {/* abrir=fundido|vuelo: the flat Tapa as the 3D book renders it, facing front, at each luz (fitted on five
            Manuales' cream field and band, max error 8/255). */}
        <filter id="match-hoy" colorInterpolationFilters="sRGB">
          <feColorMatrix values="0.751 0.151 -0.161 0 -0.030 -0.054 0.896 -0.092 0 -0.038 -0.045 0.091 0.688 0 -0.031 0 0 0 1 0" />
        </filter>
        <filter id="match-clara" colorInterpolationFilters="sRGB">
          <feColorMatrix values="0.872 0.153 -0.158 0 -0.028 -0.057 1.028 -0.097 0 -0.036 -0.046 0.103 0.803 0 -0.031 0 0 0 1 0" />
        </filter>
        <filter id="match-mas" colorInterpolationFilters="sRGB">
          <feColorMatrix values="0.944 0.150 -0.153 0 -0.024 -0.053 1.099 -0.094 0 -0.033 -0.046 0.105 0.876 0 -0.029 0 0 0 1 0" />
        </filter>
        {/* Graphite: the stroke's edge roughened, and broken up by the paper's tooth. */}
        <filter id="pencil" x="-5%" y="-60%" width="110%" height="220%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            seed="3"
            result="wobble"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="wobble"
            scale="1"
            xChannelSelector="R"
            yChannelSelector="G"
            result="rough"
          />
          <feTurbulence
            type="fractalNoise"
            baseFrequency="1.6"
            numOctaves="1"
            seed="11"
            result="tooth"
          />
          <feColorMatrix
            in="tooth"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.6 0 0 0 -0.45"
            result="mask"
          />
          <feComposite in="rough" in2="mask" operator="in" />
        </filter>
      </svg>
      {hydrated && <Bar />}
    </>
  );
}

function Bar() {
  const ideas = useIdeas();
  if (
    !import.meta.env.DEV ||
    new URLSearchParams(location.search).get("bar") === "0"
  )
    return null;
  const cycle = (idea: Idea, by: number) => {
    const options = IDEAS[idea] as readonly string[];
    const i = options.indexOf(ideas[idea]);
    choose(idea, options[(i + by + options.length) % options.length] as never);
  };
  return (
    <div className="fixed inset-x-2 bottom-2 z-50 mx-auto flex w-fit max-w-[calc(100vw-1rem)] flex-wrap justify-center gap-1 rounded-2xl bg-black/85 p-1 font-mono text-[11px] text-white shadow-lg">
      {IDEA_KEYS.map((idea) => (
        <button
          key={idea}
          type="button"
          title="clic: siguiente · shift+clic: anterior"
          onClick={(event) => {
            cycle(idea, event.shiftKey ? -1 : 1);
          }}
          className={`rounded-full px-2.5 py-1.5 hover:bg-white/15 ${ideas[idea] === IDEAS[idea][0] ? "text-white/55" : ""}`}
        >
          {idea}={ideas[idea]}
        </button>
      ))}
    </div>
  );
}

// ---- The pencil ----

/** A seeded random, so a mark is uneven but the same on every render. */
function random(seed: number) {
  let s = (seed * 9301 + 49297) % 233280 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** An underline as a student draws one: a slight bow, rising a touch to the right, ending where the hand lifts. */
function underline(width: number, seed: number) {
  const r = random(seed);
  const j = (a: number) => (r() - 0.5) * 2 * a;
  const f = (n: number) => n.toFixed(1);
  const x0 = -2 + j(1.5);
  const x1 = width + 2 + j(2);
  const y0 = 3 + j(0.6);
  const y1 = 3 - Math.min(width * 0.012, 2.5) + j(0.6);
  return `M${f(x0)} ${f(y0)} C${f(x0 + width * 0.3)} ${f(y0 + 1 + j(0.6))} ${f(x0 + width * 0.72)} ${f(y1 + 0.8 + j(0.6))} ${f(x1)} ${f(y1)}`;
}

/** A margin bracket: a short tick in, down the margin with a slight lean, and a tick out. */
function bracket(height: number, seed: number) {
  const r = random(seed);
  const j = (a: number) => (r() - 0.5) * 2 * a;
  const h = height;
  return `M${(11 + j(1)).toFixed(1)} ${j(1).toFixed(1)} Q${(3 + j(1)).toFixed(1)} ${(0.5 + j(0.5)).toFixed(1)} ${(3 + j(0.6)).toFixed(1)} ${(8 + j(1)).toFixed(1)} C${(1.5 + j(1)).toFixed(1)} ${(h * 0.38).toFixed(1)} ${(4 + j(1)).toFixed(1)} ${(h * 0.66).toFixed(1)} ${(2.5 + j(0.6)).toFixed(1)} ${(h - 8 + j(1)).toFixed(1)} Q${(2.5 + j(0.6)).toFixed(1)} ${(h + j(0.5)).toFixed(1)} ${(12 + j(1.5)).toFixed(1)} ${(h + 1 + j(1)).toFixed(1)}`;
}

/** Its own box's size, kept as it resizes. */
function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      setSize({ width: element.offsetWidth, height: element.offsetHeight });
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);
  return { ref, ...size };
}

interface PencilProps {
  /** Drawn on as it turns true, rubbed out as it turns false. */
  on: boolean;
  shape: "underline" | "bracket";
  seed: number;
  /** Stroke width in px. */
  weight?: number;
  /** Seconds before it starts drawing. */
  delay?: number;
  className?: string;
}

/** A pencil mark filling its box, drawn on rather than appearing. */
export function Pencil({
  on,
  shape,
  seed,
  weight = 1.6,
  delay = 0,
  className = "",
}: PencilProps) {
  const { ref, width, height } = useSize<HTMLSpanElement>();
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none ${className}`}
    >
      {width > 0 && (
        <svg
          width={width}
          height={height}
          className="pencil block overflow-visible"
          data-on={on}
          style={{ "--delay": `${delay}s` } as React.CSSProperties}
        >
          <path
            d={
              shape === "underline"
                ? underline(width, seed)
                : bracket(height, seed)
            }
            pathLength={1}
            fill="none"
            strokeWidth={weight}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#pencil)"
          />
          {/* A second, lighter pass, as a hand goes over the line again. */}
          <path
            d={
              shape === "underline"
                ? underline(width * 0.9, seed + 5)
                : bracket(height, seed + 5)
            }
            pathLength={1}
            fill="none"
            strokeWidth={weight * 0.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#pencil)"
            className="pencil-again"
          />
        </svg>
      )}
    </span>
  );
}

interface BookMarkProps {
  /** This step's index in the track. */
  index: number;
}

/**
 * `lapiz=subrayado|corchete`: a pencil mark on the book in focus, once the Hélice has come to rest on it. It sits in a
 * box the Tapa's size and place, above the 3D canvas.
 */
export function BookMark({ index }: BookMarkProps) {
  const lapiz = useIdea("lapiz");
  const { step, settled } = useRest();
  if (lapiz !== "subrayado" && lapiz !== "corchete") return null;
  const on = settled && step === index;
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <div className="proto-tapa relative aspect-[210/297] w-[min(72vw,40lvh)] translate-y-[2lvh] wide:translate-y-[1lvh]">
        {lapiz === "subrayado" ? (
          <Pencil
            on={on}
            shape="underline"
            seed={index + 7}
            weight={2.6}
            delay={0.2}
            className="absolute inset-x-[4%] -bottom-[5%] h-2"
          />
        ) : (
          <Pencil
            on={on}
            shape="bracket"
            seed={index + 3}
            weight={2.4}
            delay={0.2}
            className="absolute top-[56%] bottom-[7%] -left-[9%] w-3"
          />
        )}
      </div>
    </div>
  );
}

// ---- The record of the book in focus ----

interface RecordBook {
  title: string;
  /** "Paso 1 · R y Python · 47 páginas", or the Carrera first in Estadística aplicada. */
  details: string;
}

interface RecordProps {
  books: RecordBook[];
  /** Estadística aplicada has a Carrera where the others have a Paso. */
  byCarrera: boolean;
}

/** `ficha=lado|pie`: the book in focus as a catalogue record, typed in as the Hélice comes to rest on it. */
export function Record({ books, byCarrera }: RecordProps) {
  const ficha = useIdea("ficha");
  const { step, settled } = useRest();
  const book = books[step];
  if (ficha === "no" || !book) return null;
  const [first = "", herramientas = "", pages = ""] = book.details.split(" · ");
  const rows = [
    byCarrera ? ["Carrera", first] : ["Paso", first.replace("Paso ", "")],
    ["Herramientas", herramientas],
    ["Páginas", pages.replace(" páginas", "")],
  ];
  return (
    <div
      // A new book restarts the type-in; leaving it fades the record out (CSS).
      key={book.title}
      data-on={settled}
      className={`proto-record proto-record-${ficha}`}
    >
      <p
        aria-label={book.title}
        className="proto-record-title font-serif text-balance"
      >
        {/* eslint-disable-next-line @typescript-eslint/no-misused-spread -- catalog titles: Spanish letters, no emoji. */}
        {[...book.title].map((letter, i) => (
          <span
            key={i}
            aria-hidden="true"
            style={{ animationDelay: `${0.1 + i * 0.012}s` }}
          >
            {letter}
          </span>
        ))}
      </p>
      <dl className="proto-record-table">
        {rows.map(([label, value], i) => (
          <div key={label} style={{ "--row": i } as React.CSSProperties}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
