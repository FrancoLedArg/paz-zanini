import { invalidate } from "@react-three/fiber";
import { type PointerEvent, useCallback, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";

import { findManual, type Manual, MANUALES } from "../catalog/catalog";
import {
  BOOK_POSES,
  type BookPose,
  Pila,
  PILA_POSES,
  type PilaPose,
  type PointerInput,
  Stage,
  TurnableBook,
} from "./scene";

// PROTOTYPE (#7): throwaway views for the 3D gate. `?pose=<name>` freezes time and sets a pose for `pnpm shots`.

const DEFAULT_MANUAL = "estadistica-descriptiva-desde-cero";
// Top to bottom; the thinnest and thickest Manuales and every colour family.
const PILA_SLUGS = [
  "estadistica-descriptiva-desde-cero",
  "guia-para-un-buen-analisis-de-datos",
  "estadistica-aplicada-obstetricia",
  "estadistica-aplicada-informatica",
  "series-de-tiempo-aplicadas",
  "analisis-exploratorio-de-datos-r",
];
const PILA_MANUALES = PILA_SLUGS.map(findManual).filter(
  (manual): manual is Manual => manual !== undefined,
);

function parsePose<T extends string>(
  value: string | null,
  poses: Record<T, unknown>,
): T | undefined {
  // Trust boundary: a URL param is only a pose once it is a key of the pose table.
  return value !== null && Object.hasOwn(poses, value)
    ? (value as T)
    : undefined;
}

function useReveal() {
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => {
    setReady(true);
  }, []);
  return { ready, onReady };
}

const reducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;

export function BookPrototype() {
  const [params, setParams] = useSearchParams();
  const pose = parsePose<BookPose>(params.get("pose"), BOOK_POSES);
  const manual =
    findManual(params.get("manual") ?? "") ?? findManual(DEFAULT_MANUAL);
  const { ready, onReady } = useReveal();
  const [still] = useState(reducedMotion);
  const input = useRef<PointerInput>({
    dragging: false,
    startX: 0,
    dragX: 0,
    hoverX: 0,
    hoverY: 0,
  });
  const interactive = !still && !pose;

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const i = input.current;
    i.dragging = true;
    i.startX = event.clientX;
    i.dragX = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
    invalidate();
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const i = input.current;
    if (i.dragging) {
      i.dragX = event.clientX;
    } else if (interactive && event.pointerType === "mouse") {
      const box = event.currentTarget.getBoundingClientRect();
      i.hoverX = ((event.clientX - box.left) / box.width) * 2 - 1;
      i.hoverY = ((event.clientY - box.top) / box.height) * 2 - 1;
    }
    invalidate();
  };
  const onPointerEnd = () => {
    input.current.dragging = false;
    invalidate();
  };
  const onPointerLeave = () => {
    input.current.hoverX = 0;
    input.current.hoverY = 0;
    invalidate();
  };

  if (!manual) return null;
  return (
    <main className="relative h-svh overflow-hidden bg-paper font-sans">
      <div
        aria-busy={!ready}
        className={`absolute inset-0 touch-pan-y ${pose ? "" : "transition-opacity duration-700"} ${ready ? "opacity-100" : "opacity-0"}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onPointerLeave={onPointerLeave}
      >
        <Stage frozen={pose !== undefined} onReady={onReady}>
          <TurnableBook
            manual={manual}
            pose={pose}
            input={input}
            still={still}
          />
        </Stage>
      </div>
      {!pose && (
        <nav className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-4 p-4 text-sm">
          <select
            aria-label="Manual"
            value={manual.slug}
            onChange={(event) => {
              setParams({ manual: event.target.value });
            }}
            className="min-h-11 max-w-60 rounded border border-black/20 bg-white/70 px-2"
          >
            {MANUALES.map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.title}
              </option>
            ))}
          </select>
          <Link to="/dev/pila" className="flex min-h-11 items-center underline">
            Ver la Pila
          </Link>
        </nav>
      )}
    </main>
  );
}

export function PilaPrototype() {
  const [params] = useSearchParams();
  const pose = parsePose<PilaPose>(params.get("pose"), PILA_POSES);
  const { ready, onReady } = useReveal();
  return (
    <main className={`bg-paper font-sans ${pose ? "h-svh" : "h-[400svh]"}`}>
      <div
        aria-busy={!ready}
        className={`sticky top-0 h-svh ${pose ? "" : "transition-opacity duration-700"} ${ready ? "opacity-100" : "opacity-0"}`}
      >
        <Stage frozen={pose !== undefined} onReady={onReady}>
          <Pila manuales={PILA_MANUALES} pose={pose} />
        </Stage>
      </div>
      {!pose && (
        <Link
          to="/dev/book"
          className="fixed bottom-4 left-1/2 flex min-h-11 -translate-x-1/2 items-center text-sm underline"
        >
          Ver un libro
        </Link>
      )}
    </main>
  );
}
