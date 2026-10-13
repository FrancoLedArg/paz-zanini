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

/** How far a tall element has scrolled under a viewport `h` px high: 0 with its top at the viewport's top (or below), 1 with its bottom at the viewport's bottom. */
export const progress = (r: Rect, h: number) => Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - h)));
