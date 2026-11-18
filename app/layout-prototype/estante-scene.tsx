// PROTOTYPE (after #30), never merged: the 3D Estante. One Colección's books stand spine-out on a shelf, and the
// book in focus (the one whose flat Lomo crosses the canvas centre) turns face-out, pushing its neighbours aside.
import { invalidate, useFrame, useThree } from "@react-three/fiber";
import { type RefObject, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import { type Group, MathUtils } from "three";

import { bookThickness, CASE_HEIGHT, footprint } from "../book/geometry";
import {
  Book,
  ContactShadow,
  HALF_FOV_TAN,
  spring,
  Stage,
} from "../book/scene";
import { PHONE } from "../book/textures";
import { trackList } from "../book/track";
import {
  type ColeccionId,
  type Manual,
  MANUALES,
  manualPath,
} from "../catalog/catalog";

const MARGIN = 0.14; // air on each side of the face-out book
const ELEVATION = 0.06;
const COVER_Z = footprint(0).width / 2; // standing spine-out, the spines face the visitor this far out

interface ShelfProps {
  coleccion: ColeccionId;
  list: RefObject<HTMLOListElement | null>;
  onOpen: (manual: Manual) => void;
}

function Shelf({ coleccion, list, onOpen }: ShelfProps) {
  const books = useMemo(() => {
    const manuals = MANUALES.filter((m) => m.coleccion === coleccion);
    const thicknesses = manuals.map(bookThickness);
    return manuals.map((manual, i) => {
      const thickness = thicknesses[i] ?? 0;
      const before = thicknesses.slice(0, i).reduce((a, b) => a + b, 0);
      return {
        manual,
        thickness,
        width: footprint(thickness).width,
        restX: before + thickness / 2,
      };
    });
  }, [coleccion]);
  const last = books.length - 1;
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const canvas = useThree((state) => state.gl.domElement);
  const places = useRef<(Group | null)[]>([]);
  const turns = useRef<(Group | null)[]>([]);
  const focus = useRef<{ x: number; v: number } | null>(null);

  useEffect(() => {
    const scroller = list.current?.parentElement;
    const onScroll = () => {
      invalidate();
    };
    scroller?.addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      scroller?.removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      document.body.style.cursor = "";
    };
  }, [list]);

  useFrame((_, delta) => {
    const ol = list.current;
    if (!ol) return;
    const box = canvas.getBoundingClientRect();
    const centres = Array.from(ol.children, (item) => {
      const rect = item.getBoundingClientRect();
      return rect.left + rect.width / 2;
    });
    const { index: target } = trackList(centres, box.left + box.width / 2);
    focus.current ??= { x: target, v: 0 };
    const moving = spring(focus.current, target, Math.min(delta, 1 / 30));
    const f = focus.current.x;

    // Left to right: each book makes room for its turn to face-out, by how far it has turned.
    let opened = 0;
    const xs = books.map((book, i) => {
      const weight = MathUtils.smoothstep(1 - Math.abs(i - f), 0, 1);
      const extra = (book.width - book.thickness + 2 * MARGIN) * weight;
      const x = book.restX + opened + extra / 2;
      opened += extra;
      // Turning, it comes forward so its cover lands where the spines stand.
      places.current[i]?.position.set(
        x,
        0,
        (book.width / 2 - book.thickness / 2 + 0.06) * weight,
      );
      // Spine-out the front cover faces right (Lomo reads top to bottom); face-out it faces the visitor.
      turns.current[i]?.rotation.set(0, (Math.PI / 2) * (1 - weight), 0);
      return x;
    });

    // Unsprung, so the shelf moves with the finger; the flat list's height is the spine, which sets the scale.
    const index = MathUtils.clamp(Math.floor(target), 0, last);
    const camX = MathUtils.lerp(
      xs[index] ?? 0,
      xs[Math.min(index + 1, last)] ?? 0,
      target - index,
    );
    const pxPerUnit = ol.clientHeight / CASE_HEIGHT;
    const distance = size.height / (pxPerUnit * 2 * HALF_FOV_TAN);
    const lookY = CASE_HEIGHT / 2;
    camera.position.set(
      camX,
      lookY + distance * Math.sin(ELEVATION),
      COVER_Z + distance * Math.cos(ELEVATION),
    );
    camera.lookAt(camX, lookY, COVER_Z);
    if ("setViewOffset" in camera) {
      const listBox = ol.getBoundingClientRect();
      const dy = listBox.top + listBox.height / 2 - (box.top + box.height / 2);
      camera.setViewOffset(
        size.width,
        size.height,
        0,
        -dy,
        size.width,
        size.height,
      );
    }
    if (moving) invalidate();
  });

  return (
    <>
      {books.map((book, i) => (
        <group
          key={book.manual.slug}
          ref={(node) => {
            places.current[i] = node;
          }}
          onClick={(event) => {
            event.stopPropagation();
            onOpen(book.manual);
          }}
          onPointerOver={(event) => {
            event.stopPropagation();
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "";
          }}
        >
          <group
            ref={(node) => {
              turns.current[i] = node;
            }}
          >
            <ContactShadow width={book.width} depth={book.thickness} />
            <group position-y={CASE_HEIGHT / 2}>
              <Book manual={book.manual} pxPerUnit={PHONE ? 420 : 676} />
            </group>
          </group>
        </group>
      ))}
    </>
  );
}

interface EstanteViewProps {
  coleccion: ColeccionId;
  list: RefObject<HTMLOListElement | null>;
  className?: string;
}

export function EstanteView({ coleccion, list, className }: EstanteViewProps) {
  const navigate = useNavigate();
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
  return (
    <Stage frozen={false} fallback={null} className={className}>
      <Shelf
        coleccion={coleccion}
        list={list}
        onOpen={(manual) => void navigate(manualPath(manual))}
      />
    </Stage>
  );
}
