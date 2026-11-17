import {
  BoxGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  ShapeUtils,
  Vector2,
} from "three";

// PROTOTYPE (#7). The hardcover, built in code (book-3d Anatomy). World unit = 10 cm.
// Book space: x across the cover (spine at -x), y up the page, z through the book (front cover at +z).
export const PAGE_WIDTH = 2.1;
export const PAGE_HEIGHT = 2.97;
const SQUARE = 0.03; // how far the boards overhang the pages on the three open sides
const BOARD = 0.024;
const SPINE_SHELL = 0.012;
const SPINE_BULGE = 0.06;
const JOINT = 0.07; // width of the hinge groove between board and spine
const GROOVE_DEPTH = 0.01;
const FILLET = 0.006; // rounds the board's fore-edge: the rim highlight
const BEVEL = 0.006; // rounds the head and tail edges
const BEVEL_STEPS = 4;
const EDGE = 0.002; // an extra ring or point this close to every curve keeps smooth normals off the flat faces
export const CASE_HEIGHT = PAGE_HEIGHT + 2 * SQUARE;

/** Lengths along the outside of the cover, in world units, for laying the cover art out. */
export interface CoverLayout {
  /** The flat front board, which carries the Tapa. */
  board: number;
  /** Each hinge groove. */
  joint: number;
  /** The rounded spine, which carries the Lomo. */
  spine: number;
}

interface ContourPoint {
  x: number;
  z: number;
  /** Arc length from the front fore-edge along the outside of the cover; inner faces and rims have none. */
  outer?: number;
  /** Which board a non-outer point belongs to, so it samples a plain column of the art. */
  side: "front" | "back";
}

/**
 * The cover case (both boards and the spine) as one closed solid, swept along the page height.
 * `uv` lays the cover art out as [back joint | spine | front joint | front board]; `uv1` is in world units, for micro-detail.
 */
export function caseGeometry(thickness: number) {
  const contour = caseContour(thickness);
  const layout = coverLayout(thickness);
  const artWidth = layout.board + 2 * layout.joint + layout.spine;

  // Close the loop with a duplicate of the first point, so world-unit UVs don't wrap back to 0 across one quad.
  // The seam sits mid-way round the inner spine, where nobody can see it.
  let length = 0;
  const loop = [...contour, ...contour.slice(0, 1)].map((p, i, all) => {
    const previous = all[i - 1] ?? p;
    length += Math.hypot(p.x - previous.x, p.z - previous.z);
    return {
      ...p,
      length,
      normal: contourNormal(contour, i % contour.length),
      artU:
        p.outer === undefined
          ? p.side === "front"
            ? 1
            : 0
          : Math.max(0, 1 - p.outer / artWidth),
    };
  });

  // Rings up the page: a quarter-round bevel at each end, inset toward the inside of the contour.
  const rings: { y: number; inset: number }[] = [];
  for (let k = 0; k <= BEVEL_STEPS; k++) {
    const angle = (k / BEVEL_STEPS) * (Math.PI / 2);
    rings.push({
      y: -CASE_HEIGHT / 2 + BEVEL * (1 - Math.cos(angle)),
      inset: BEVEL * (1 - Math.sin(angle)),
    });
  }
  rings.push({ y: -CASE_HEIGHT / 2 + BEVEL + EDGE, inset: 0 });
  const bottomHalf = rings.slice();
  for (const ring of bottomHalf.reverse()) rings.push({ ...ring, y: -ring.y });

  const position: number[] = [];
  const uv: number[] = [];
  const uv1: number[] = [];
  const index: number[] = [];
  // The board edges (head and tail caps and bevels, fore-edge fillets) get their own, glossier material: the rim highlight.
  const rimIndex: number[] = [];
  const columns = loop.length;
  const onFillet = loop.map((p) => p.outer === undefined && p.x >= FORE_EDGE_X);
  const lastBevelBand = rings.length - 1 - BEVEL_STEPS;

  for (const ring of rings) {
    for (const p of loop) {
      const n = p.normal;
      position.push(p.x - n.x * ring.inset, ring.y, p.z - n.y * ring.inset);
      uv.push(p.artU, (ring.y + CASE_HEIGHT / 2) / CASE_HEIGHT);
      uv1.push(p.length, ring.y);
    }
  }
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < columns - 1; i++) {
      const a = r * columns + i;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      const rim =
        r < BEVEL_STEPS ||
        r >= lastBevelBand ||
        onFillet[i] === true ||
        onFillet[i + 1] === true;
      // The contour runs counter-clockwise in (x, z), so this winding faces outward.
      (rim ? rimIndex : index).push(a, c, b, b, c, d);
    }
  }

  // Head and tail caps, flat-shaded: their own vertices, on the fully inset contour. They are board edges too.
  const capContour = contour.map((p, i) => {
    const n = contourNormal(contour, i);
    return new Vector2(p.x - n.x * BEVEL, p.z - n.y * BEVEL);
  });
  const triangles = ShapeUtils.triangulateShape(capContour, []);
  for (const y of [-CASE_HEIGHT / 2, CASE_HEIGHT / 2]) {
    const start = position.length / 3;
    for (const p of capContour) {
      position.push(p.x, y, p.y);
      uv.push(1, 0.5); // the Tapa's right margin: plain cover colour
      uv1.push(p.x, p.y);
    }
    for (const [a = 0, b = 0, c = 0] of triangles) {
      const origin = new Vector2();
      const pa = capContour[a] ?? origin;
      const pb = capContour[b] ?? origin;
      const pc = capContour[c] ?? origin;
      const cross =
        (pb.x - pa.x) * (pc.y - pa.y) - (pb.y - pa.y) * (pc.x - pa.x);
      // Counter-clockwise in (x, z) faces -y: keep it for the tail, flip it for the head.
      const facesDown = cross > 0;
      if (facesDown === y < 0) rimIndex.push(start + a, start + b, start + c);
      else rimIndex.push(start + a, start + c, start + b);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(position, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  geometry.setAttribute("uv1", new Float32BufferAttribute(uv1, 2));
  geometry.setIndex([...index, ...rimIndex]);
  geometry.addGroup(0, index.length, 0);
  geometry.addGroup(index.length, rimIndex.length, 1);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return { geometry, layout };
}

/** The page block, inset from the boards by the squares. Box face order: +x (fore-edge), -x, +y (head), -y, +z, -z. */
export function pageBlockGeometry(thickness: number) {
  // A hair thinner than the gap, so its faces never sit coplanar with the boards.
  return new BoxGeometry(
    PAGE_WIDTH,
    PAGE_HEIGHT,
    thickness - 2 * BOARD - 0.002,
  );
}

/** The book's outline seen from above when it stands, for its contact shadow. */
export function footprint(thickness: number) {
  const left = SPINE_X - SPINE_BULGE;
  const right = FORE_EDGE_X + FILLET;
  return { centerX: (left + right) / 2, width: right - left, depth: thickness };
}

function coverLayout(thickness: number): CoverLayout {
  let joint = 0;
  let previous = groovePoint(thickness, 0);
  for (let i = 1; i <= 64; i++) {
    const next = groovePoint(thickness, i / 64);
    joint += Math.hypot(next.x - previous.x, next.z - previous.z);
    previous = next;
  }
  let spine = 0;
  let last = spinePoint(thickness, 0, 0);
  for (let i = 1; i <= 128; i++) {
    const next = spinePoint(thickness, (i / 128) * Math.PI, 0);
    spine += Math.hypot(next.x - last.x, next.z - last.z);
    last = next;
  }
  return { board: PAGE_WIDTH, joint, spine };
}

// x where the board's flat face meets its fore-edge fillet, and where it meets the hinge groove.
const FORE_EDGE_X = PAGE_WIDTH / 2 + SQUARE - FILLET;
const BOARD_SPINE_X = FORE_EDGE_X - PAGE_WIDTH;
const SPINE_X = BOARD_SPINE_X - JOINT;

/** The groove on the front board, from board (t = 0) to spine (t = 1); smooth at both ends. */
function groovePoint(thickness: number, t: number) {
  const u = 2 * t - 1;
  return {
    x: BOARD_SPINE_X - JOINT * t,
    z: thickness / 2 - GROOVE_DEPTH * (1 - u * u) ** 2,
  };
}

/** The spine's half-ellipse, front (angle 0) to back (π); `shell` > 0 gives the inner surface. */
function spinePoint(thickness: number, angle: number, shell: number) {
  return {
    x: SPINE_X - (SPINE_BULGE - shell) * Math.sin(angle),
    z: (thickness / 2 - (shell ? BOARD : 0)) * Math.cos(angle),
  };
}

/** The case's cross-section, counter-clockwise in (x, z), starting mid-way round the inner spine. */
function caseContour(thickness: number): ContourPoint[] {
  const half = thickness / 2;
  const points: ContourPoint[] = [];
  let outer = 0;
  const addOuter = (x: number, z: number) => {
    const last = points.at(-1);
    if (last?.outer !== undefined) outer += Math.hypot(x - last.x, z - last.z);
    points.push({ x, z, outer, side: z >= 0 ? "front" : "back" });
  };
  const add = (x: number, z: number, side: ContourPoint["side"]) =>
    points.push({ x, z, side });

  // Inner spine, from its middle to the front, then the front board's inner face.
  for (let i = 12; i >= 0; i--) {
    const p = spinePoint(thickness, (i / 24) * Math.PI, SPINE_SHELL);
    add(p.x, p.z, "front");
  }
  add(SPINE_X + EDGE, half - BOARD, "front");
  add(FORE_EDGE_X - EDGE, half - BOARD, "front");
  // Front fore-edge: two fillets joined by a short flat.
  for (let i = 0; i <= 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2);
    add(
      FORE_EDGE_X + FILLET * Math.cos(a),
      half - BOARD + FILLET + FILLET * Math.sin(a),
      "front",
    );
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    add(
      FORE_EDGE_X + FILLET * Math.cos(a),
      half - FILLET + FILLET * Math.sin(a),
      "front",
    );
  }
  // Outside of the cover: front board, groove, spine, groove, back board.
  addOuter(FORE_EDGE_X, half);
  addOuter(FORE_EDGE_X - EDGE, half);
  addOuter(BOARD_SPINE_X + EDGE, half);
  for (let i = 0; i <= 16; i++) {
    const p = groovePoint(thickness, i / 16);
    addOuter(p.x, p.z);
  }
  for (let i = 1; i < 32; i++) {
    const p = spinePoint(thickness, (i / 32) * Math.PI, 0);
    addOuter(p.x, p.z);
  }
  for (let i = 16; i >= 0; i--) {
    const p = groovePoint(thickness, i / 16);
    addOuter(p.x, -p.z);
  }
  addOuter(BOARD_SPINE_X + EDGE, -half);
  addOuter(FORE_EDGE_X - EDGE, -half);
  addOuter(FORE_EDGE_X, -half);
  // Back fore-edge.
  for (let i = 1; i <= 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2);
    add(
      FORE_EDGE_X + FILLET * Math.cos(a),
      -half + FILLET + FILLET * Math.sin(a),
      "back",
    );
  }
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    add(
      FORE_EDGE_X + FILLET * Math.cos(a),
      -half + BOARD - FILLET + FILLET * Math.sin(a),
      "back",
    );
  }
  // Back board's inner face, then the inner spine back to its middle.
  add(FORE_EDGE_X - EDGE, -half + BOARD, "back");
  add(SPINE_X + EDGE, -half + BOARD, "back");
  for (let i = 24; i > 12; i--) {
    const p = spinePoint(thickness, (i / 24) * Math.PI, SPINE_SHELL);
    add(p.x, p.z, "back");
  }
  return points;
}

/** Outward unit normal at a contour point, in (x, z), averaged over its two edges. */
function contourNormal(contour: ContourPoint[], i: number): Vector2 {
  const n = contour.length;
  const prev = contour[(i - 1 + n) % n] ?? { x: 0, z: 0 };
  const next = contour[(i + 1) % n] ?? { x: 0, z: 0 };
  // Counter-clockwise contour: the outward normal is the tangent turned clockwise.
  return new Vector2(next.z - prev.z, -(next.x - prev.x)).normalize();
}
