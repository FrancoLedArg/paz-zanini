export type Rect = { left: number; top: number; width: number; height: number };

/** A DOM slot (CSS px from the top-left) as a WebGL viewport (from the bottom-left), or null when it is off the canvas. */
export function viewport(r: Rect, canvasW: number, canvasH: number) {
  if (r.top >= canvasH || r.top + r.height <= 0 || r.left >= canvasW || r.left + r.width <= 0) return null;
  return { x: r.left, y: canvasH - r.top - r.height, w: r.width, h: r.height };
}

/** A pointer in client px as normalized device coordinates inside the slot, ready for a Raycaster. */
export function ndc(clientX: number, clientY: number, r: Rect) {
  return { x: ((clientX - r.left) / r.width) * 2 - 1, y: 1 - ((clientY - r.top) / r.height) * 2 };
}

/** A horizontal span of the scene: x from x0 to x1 at height y, with its back edge (the far end, screen-up) at z. */
export type Plane = { x0: number; x1: number; y: number; z: number };

/** Where a camera looking straight down (screen-up = -z) sits so the plane's width lands on the DOM rect's width and its back edge on the rect's top. */
export function topDown(r: Rect, p: Plane, canvasW: number, canvasH: number, fov: number) {
  const k = r.width / (p.x1 - p.x0); // px per meter on the plane
  return {
    x: p.x0 + (canvasW / 2 - r.left) / k,
    y: p.y + canvasH / k / 2 / Math.tan((fov * Math.PI) / 360),
    z: p.z + (canvasH / 2 - r.top) / k,
  };
}

/** Linear blend of two rects. */
export const mix = (a: Rect, b: Rect, t: number): Rect => ({
  left: a.left + (b.left - a.left) * t,
  top: a.top + (b.top - a.top) * t,
  width: a.width + (b.width - a.width) * t,
  height: a.height + (b.height - a.height) * t,
});
