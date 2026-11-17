import { invalidate } from "@react-three/fiber";
import { type PointerEvent, type ReactNode, useRef, useState } from "react";
import { useSearchParams } from "react-router";

import type { Manual } from "../catalog/catalog";
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

// The 3D book (book-3d): a turnable book for a Manual page, and the Pila. Load this module lazily, after first paint.

/** Dev only: `?pose=<name>` freezes time and sets a pose, so `pnpm shots` frames are reproducible (book-3d Visual review). */
function usePose<T extends string>(poses: Record<T, unknown>): T | undefined {
  const [params] = useSearchParams();
  const value = params.get("pose");
  // Trust boundary: a URL param is only a pose once it is a key of the pose table.
  return import.meta.env.DEV && value !== null && Object.hasOwn(poses, value)
    ? (value as T)
    : undefined;
}

const reducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;

interface TurnableBookViewProps {
  manual: Manual;
  /** Shown instead of the book when 3D can't run. */
  fallback: ReactNode;
  className?: string;
}

/** One book a horizontal drag turns; vertical scroll stays native. Under reduced motion it rests at its hero pose. */
export function TurnableBookView({
  manual,
  fallback,
  className = "",
}: TurnableBookViewProps) {
  const pose = usePose<BookPose>(BOOK_POSES);
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
    } else return;
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

  return (
    <Stage
      frozen={pose !== undefined}
      fallback={fallback}
      className={`touch-pan-y ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onPointerLeave={onPointerLeave}
    >
      <TurnableBook manual={manual} pose={pose} input={input} still={still} />
    </Stage>
  );
}

interface PilaViewProps {
  /** Top to bottom. */
  manuales: readonly Manual[];
  /** Shown instead of the stack when 3D can't run: the flat Pila. */
  fallback: ReactNode;
  className?: string;
}

/** The stack of books, driven by the page's own scroll. Under reduced motion the flat Pila stands in (ADR 0001). */
export function PilaView({ manuales, fallback, className }: PilaViewProps) {
  const pose = usePose<PilaPose>(PILA_POSES);
  const [still] = useState(reducedMotion);
  if (still) return fallback;
  return (
    <Stage
      frozen={pose !== undefined}
      fallback={fallback}
      className={className}
    >
      <Pila manuales={manuales} pose={pose} />
    </Stage>
  );
}
