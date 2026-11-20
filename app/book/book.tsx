import { invalidate } from "@react-three/fiber";
import {
  type PointerEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useRef,
  useState,
} from "react";
import { useNavigate, useSearchParams } from "react-router";

import { type ColeccionId, type Manual, manualPath } from "../catalog/catalog";
import { ideaNow } from "../audit-prototype/prototype";
import { reducedMotion } from "../shared/motion";
import {
  BOOK_POSES,
  type BookPose,
  HELICE_POSES,
  HeliceScene,
  hideForFlight,
  type HelicePose,
  type PointerInput,
  Stage,
  TurnableBook,
} from "./scene";

// The 3D book (book-3d): a turnable book for a Manual page, and the Hélice. Load this module lazily, after first paint.

/** Dev only: `?pose=<name>` freezes time and sets a pose, so `pnpm shots` frames are reproducible (book-3d Visual review). */
function usePose<T extends string>(poses: Record<T, unknown>): T | undefined {
  const [params] = useSearchParams();
  const value = params.get("pose");
  // Trust boundary: a URL param is only a pose once it is a key of the pose table.
  return import.meta.env.DEV && value !== null && Object.hasOwn(poses, value)
    ? (value as T)
    : undefined;
}

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

interface HeliceViewProps {
  /** The flat track: the Hélice follows its step in view as the page scrolls. */
  track: RefObject<HTMLElement | null>;
  /** The Colección on the track: the Hélice holds the same books. */
  coleccion: ColeccionId;
  className?: string;
}

/**
 * The Hélice over the flat track, driven by the page's own scroll. Tapping a book opens its Manual page. Under reduced
 * motion, or when 3D fails, it renders nothing and the flat track stays (ADR 0003).
 */
export function HeliceView({ track, coleccion, className }: HeliceViewProps) {
  const pose = usePose<HelicePose>(HELICE_POSES);
  const [still] = useState(reducedMotion);
  const navigate = useNavigate();
  // Stable, so the Hélice's memoised books don't re-render when the URL's search params change.
  const onOpen = useCallback(
    (manual: Manual, newTab: boolean) => {
      const path = manualPath(manual);
      if (newTab) open(path, "_blank", "noopener");
      else if (ideaNow("abrir") === "vuelo") {
        // PROTOTYPE (#77): the flat Tapa under the book shows for the snapshot and flies to the Manual page's Tapa.
        const tapa = track.current?.querySelector<HTMLElement>(
          `a[href="${path}"] > span`,
        );
        const box = tapa?.getBoundingClientRect();
        if (
          tapa &&
          box &&
          box.top > -box.height / 2 &&
          box.bottom < innerHeight + box.height / 2
        ) {
          tapa.style.transition = "none";
          tapa.style.opacity = "1";
          tapa.style.viewTransitionName = "tapa";
          hideForFlight(manual.slug);
        }
        // Two frames, so the canvas has drawn without the book before the snapshot.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            void navigate(path, { viewTransition: true });
          }),
        );
      } else void navigate(path);
    },
    [navigate, track],
  );
  if (still) return null;
  return (
    <Stage frozen={pose !== undefined} fallback={null} className={className}>
      <HeliceScene
        track={track}
        coleccion={coleccion}
        pose={pose}
        onOpen={onOpen}
      />
    </Stage>
  );
}
