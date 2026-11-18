// PROTOTYPE, never merged: three paths for the books, freed from gravity. The page's own vertical scroll moves a
// focus along the series; every book is placed by its distance `d` from that focus, so one continuous movement
// carries each book into the place of honour (d = 0: big, facing the visitor) and out again.
import { invalidate, useFrame, useThree } from "@react-three/fiber";
import { type RefObject, Suspense, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { type Group, MathUtils } from "three";

import { CASE_HEIGHT } from "../book/geometry";
import { Book, HALF_FOV_TAN, spring, Stage } from "../book/scene";
import { PHONE } from "../book/textures";
import { MANUALES, manualPath } from "../catalog/catalog";

export type BookPath = "helix" | "rolodex" | "tunnel";

const PAPER = "#f2f0ea"; // --color-paper as hex, for the fog
const BOOK_WIDTH = 2.13;
const H = CASE_HEIGHT;

interface Pose {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
}

/** Where book `i` sits at distance `d` from the focus (positive: still to come). */
const PATHS: Record<
  BookPath,
  {
    place: (d: number, i: number) => Pose;
    /** How many books either side of the focus are mounted. */
    reach: number;
    camera: { y: number; lookY: number };
    fog: [number, number];
  }
> = {
  // A spiral staircase of floating books: each comes round from behind, faces the visitor, and swings away below.
  helix: {
    place: (d) => {
      const angle = d * 0.78;
      const radius = 4.6;
      return {
        x: radius * Math.sin(angle),
        y: -d * 1.7,
        z: radius * (Math.cos(angle) - 1),
        rx: 0,
        ry: angle,
        rz: 0,
      };
    },
    reach: 6,
    camera: { y: 1.4, lookY: -0.3 },
    fog: [3, 13],
  },
  // Books hang from their spines' foot on a horizontal axis and flip past like cards: the next ones lean back behind
  // the one in focus, the past ones fall forward and away.
  rolodex: {
    place: (d) => {
      const angle = d >= 0 ? Math.min(d * 0.5, 1.25) : Math.max(d * 1.7, -1.95);
      const radius = 0.5;
      const reach = radius + H / 2;
      return {
        x: 0,
        // A passed book falls forward and drops out of the frame, clear of the words.
        y: -H / 2 - radius + Math.cos(angle) * reach - (d < 0 ? 3 * -d : 0),
        z: -Math.sin(angle) * reach,
        rx: -angle,
        ry: 0,
        rz: 0,
      };
    },
    reach: 7,
    camera: { y: 5.2, lookY: 0 },
    fog: [3, 12],
  },
  // Books drift toward the visitor out of the depth, each slightly turned, and pass beside the camera.
  tunnel: {
    place: (d, i) => {
      const spread = Math.abs(d);
      // A passed book leaves to one side, clear of the one in focus.
      const side = i % 2 ? 1 : -1;
      return {
        x: d < 0 ? side * 3.4 * spread : Math.sin(i * 2.1) * 1.1 * spread,
        y: d < 0 ? 1.3 * spread : Math.cos(i * 1.3) * 0.7 * spread,
        z: -d * 3.4,
        rx: Math.cos(i * 1.7) * 0.18 * Math.min(spread, 2),
        ry: Math.sin(i * 3.1) * 0.4 * Math.min(spread, 2),
        rz: Math.sin(i * 0.9) * 0.12 * Math.min(spread, 2),
      };
    },
    reach: 5,
    camera: { y: 0, lookY: 0 },
    fog: [4, 20],
  },
};

interface PathSceneProps {
  path: BookPath;
  track: RefObject<HTMLDivElement | null>;
  onOpen: (index: number) => void;
}

function PathScene({ path, track, onOpen }: PathSceneProps) {
  const { place, reach, camera: aim, fog } = PATHS[path];
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const [near, setNear] = useState(0);
  const groups = useRef<(Group | null)[]>([]);
  const focus = useRef<{ x: number; v: number } | null>(null);

  useEffect(() => {
    const onScroll = () => {
      invalidate();
    };
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      removeEventListener("scroll", onScroll);
      document.body.style.cursor = "";
    };
  }, []);

  useEffect(() => {
    invalidate();
  }, [near]);

  useFrame(({ scene: { fog: haze } }, delta) => {
    const anchors = track.current?.children;
    const step =
      anchors && anchors.length > 1
        ? (anchors[1] as HTMLElement).offsetTop
        : innerHeight;
    const target = MathUtils.clamp(scrollY / step, 0, MANUALES.length - 1);
    focus.current ??= { x: target, v: 0 };
    const moving = spring(focus.current, target, Math.min(delta, 1 / 30));
    const f = focus.current.x;
    const centre = Math.round(f);
    if (centre !== near) setNear(centre);

    // The book in focus fills ~60% of the height, or ~72% of a narrow screen's width.
    const aspect = size.width / size.height;
    const d = Math.max(
      H / (0.6 * 2 * HALF_FOV_TAN),
      BOOK_WIDTH / (0.72 * 2 * HALF_FOV_TAN * aspect),
    );
    if (haze && "near" in haze) {
      haze.near = d + fog[0];
      haze.far = d + fog[1];
    }
    camera.position.set(0, aim.y, d);
    camera.lookAt(0, aim.lookY, 0);
    // On a phone the book sits in the upper part, over its words.
    if ("setViewOffset" in camera) {
      camera.setViewOffset(
        size.width,
        size.height,
        // On desktop the book sits right of centre, clear of the words in the left column.
        aspect < 0.8 ? 0 : -size.width * 0.1,
        aspect < 0.8 ? size.height * 0.13 : 0,
        size.width,
        size.height,
      );
    }

    for (let i = near - reach; i <= near + reach; i++) {
      const group = groups.current[i];
      if (!group) continue;
      const p = place(i - f, i);
      group.position.set(p.x, p.y, p.z);
      group.rotation.set(p.rx, p.ry, p.rz);
      // Anything at or behind the camera is skipped.
      group.visible = p.z < d - 0.8;
    }
    if (moving) invalidate();
  });

  return (
    <>
      <fog attach="fog" args={[PAPER, 12, 30]} />
      {MANUALES.map((manual, i) =>
        Math.abs(i - near) <= reach ? (
          <group
            key={manual.slug}
            // Hidden until its first frame has placed it; R3F sets this once, on mount.
            visible={false}
            ref={(node) => {
              groups.current[i] = node;
            }}
            onClick={(event) => {
              event.stopPropagation();
              onOpen(i);
            }}
            onPointerOver={(event) => {
              event.stopPropagation();
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "";
            }}
          >
            <Suspense fallback={null}>
              <Book manual={manual} pxPerUnit={PHONE ? 420 : 676} />
            </Suspense>
          </group>
        ) : null,
      )}
    </>
  );
}

interface PathViewProps {
  path: BookPath;
  track: RefObject<HTMLDivElement | null>;
  className?: string;
}

export function PathView({ path, track, className }: PathViewProps) {
  const navigate = useNavigate();
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
  return (
    <Stage frozen={false} fallback={null} className={className}>
      <PathScene
        path={path}
        track={track}
        onOpen={(i) => {
          const manual = MANUALES[i];
          if (manual) void navigate(manualPath(manual));
        }}
      />
    </Stage>
  );
}
