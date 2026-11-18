// PROTOTYPE, never merged: el Pliego's 3D book. Each spread holds a placeholder for its book; the book is drawn on
// it, so it travels with the page natively. Only the protagonist and its two neighbours are mounted. Arriving, a
// book turns in from its spine to its hero pose; leaving, it turns away.
import { invalidate, useFrame, useThree } from "@react-three/fiber";
import { type RefObject, Suspense, useEffect, useRef, useState } from "react";
import { type Group, MathUtils } from "three";

import { CASE_HEIGHT } from "../book/geometry";
import { Book, HALF_FOV_TAN, spring, Stage } from "../book/scene";
import { PHONE } from "../book/textures";
import { MANUALES } from "../catalog/catalog";

const DISTANCE = 12;
const HERO_YAW = 0.42; // as on the Manual page: the Tapa, with a glimpse of the Lomo
const TURN = 1.25; // how far a neighbour is turned away
const PITCH = 0.12; // the head leans toward the visitor, as if seen from a little above

interface SpreadsProps {
  scroller: RefObject<HTMLDivElement | null>;
}

function Spreads({ scroller }: SpreadsProps) {
  const camera = useThree((state) => state.camera);
  const canvas = useThree((state) => state.gl.domElement);
  const [near, setNear] = useState(() =>
    Math.round(
      (scroller.current?.scrollLeft ?? 0) /
        (scroller.current?.clientWidth ?? 1),
    ),
  );
  const groups = useRef<(Group | null)[]>([]);
  const yaws = useRef(MANUALES.map(() => ({ x: HERO_YAW + TURN, v: 0 })));

  useEffect(() => {
    camera.position.set(0, 0, DISTANCE);
    camera.lookAt(0, 0, 0);
    invalidate();
  }, [camera]);

  useEffect(() => {
    const el = scroller.current;
    const onChange = () => {
      invalidate();
    };
    el?.addEventListener("scroll", onChange, { passive: true });
    addEventListener("resize", onChange);
    return () => {
      el?.removeEventListener("scroll", onChange);
      removeEventListener("resize", onChange);
    };
  }, [scroller]);

  useFrame((_, delta) => {
    const el = scroller.current;
    if (!el) return;
    const progress = el.scrollLeft / el.clientWidth;
    const centre = Math.round(progress);
    if (centre !== near) setNear(centre);
    const box = canvas.getBoundingClientRect();
    const unitsPerPx = (2 * DISTANCE * HALF_FOV_TAN) / box.height;
    const slots = el.querySelectorAll<HTMLElement>("[data-book]");
    const dt = Math.min(delta, 1 / 30);
    let moving = false;
    for (let i = near - 1; i <= near + 1; i++) {
      const group = groups.current[i];
      const slot = slots[i];
      const yaw = yaws.current[i];
      if (!group || !slot || !yaw) continue;
      const rect = slot.getBoundingClientRect();
      group.position.set(
        (rect.left + rect.width / 2 - box.left - box.width / 2) * unitsPerPx,
        -(rect.top + rect.height / 2 - box.top - box.height / 2) * unitsPerPx,
        0,
      );
      group.scale.setScalar((rect.height * unitsPerPx) / CASE_HEIGHT);
      const offset = MathUtils.clamp(i - progress, -1, 1);
      moving = spring(yaw, HERO_YAW + offset * TURN, dt) || moving;
      group.rotation.set(PITCH, yaw.x, 0);
      group.visible = true;
    }
    if (moving) invalidate();
  });

  return MANUALES.map((manual, i) =>
    Math.abs(i - near) <= 1 ? (
      <group
        key={manual.slug}
        ref={(node) => {
          // Hidden until its first frame has placed it on its spread.
          if (node && groups.current[i] !== node) node.visible = false;
          groups.current[i] = node;
        }}
      >
        {/* Its own boundary: a neighbour still loading its cover doesn't blank the protagonist. */}
        <Suspense fallback={null}>
          <Book manual={manual} pxPerUnit={PHONE ? 420 : 676} />
        </Suspense>
      </group>
    ) : null,
  );
}

interface PliegoViewProps {
  scroller: RefObject<HTMLDivElement | null>;
  className?: string;
}

export function PliegoView({ scroller, className }: PliegoViewProps) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
  return (
    <Stage frozen={false} fallback={null} className={className}>
      <Spreads scroller={scroller} />
    </Stage>
  );
}
