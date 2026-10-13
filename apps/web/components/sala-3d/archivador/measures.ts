// Every size in the Archivador, in meters.
// The cabinet stands on the floor at the origin, its front facing +z.
// Change a size here and the pieces built from it follow.

/**
 * A hair (2 mm). Pieces that touch sink this far into each other, so no seam shows between them;
 * surfaces that face each other stay this far apart, so they don't flicker into each other (z-fighting).
 */
export const HAIR = 0.002;

/** How far something printed (a Rótulo, a tab's label) floats over the surface it's printed on: just enough not to flicker. */
export const PRINT_OFFSET = 0.0005;

/** How round the edges are: the thicker the piece, the rounder. */
export const ROUNDING = {
  handle: 0.008,
  /** Drawer fronts and the lip on top. */
  front: 0.006,
  /** The cabinet's walls and the plinth. */
  wall: 0.004,
  /** Thin steel: trays, rails, shelves, the Rótulo's holder. */
  sheet: 0.002,
  /** The Carpetas' cardboard. */
  board: 0.001,
} as const;

/** The cabinet's body. */
export const CABINET = {
  width: 0.5,
  height: 1.36,
  depth: 0.62,
  /** The plinth under the drawers. */
  baseHeight: 0.07,
  topThickness: 0.035,
  /** The steel sheet of the sides and the back. */
  wallThickness: 0.012,
  floorThickness: 0.006,
  /** The lip on top sticks out this far past the sides, front and back. */
  lipOverhang: 0.006,
} as const;

/** The plinth: narrower than the cabinet, and set back from its front. */
export const PLINTH = {
  width: CABINET.width - 0.04,
  depth: CABINET.depth - 0.06,
  z: -0.02,
} as const;

const drawerCount = 5;
const drawerGap = 0.008;

export const DRAWER = {
  count: drawerCount,
  /** The rail between two drawers. */
  gap: drawerGap,
  /** How deep the rail between two drawers is, front to back. */
  railDepth: 0.02,
  /** The five drawers share the height left between the plinth and the top. */
  height: (CABINET.height - CABINET.baseHeight - CABINET.topThickness - drawerGap * (drawerCount - 1)) / drawerCount,
  /** How far a drawer slides out: ajar while the camera passes it, a bit more under the pointer, open on a click. */
  slide: { ajar: 0.05, peek: 0.09, open: 0.42 },
} as const;

/** A drawer's front: a little narrower than the cabinet, so it doesn't rub the sides. */
export const DRAWER_FRONT = {
  width: CABINET.width - 0.024,
  thickness: 0.022,
} as const;

const handleDepth = 0.028;

/** The handle, below the Rótulo, sunk a hair into the drawer front. Heights are measured from the drawer's center. */
export const HANDLE = {
  width: 0.16,
  height: 0.02,
  depth: handleDepth,
  y: -DRAWER.height * 0.33,
  z: DRAWER_FRONT.thickness - HAIR + handleDepth / 2,
} as const;

const trayFloorY = -0.005 - (DRAWER.height - 0.05) / 2;

/** The tray behind each drawer front. Heights are measured from the drawer's center. */
export const TRAY = {
  width: CABINET.width - 0.06,
  depth: 0.5,
  wallThickness: 0.008,
  floorThickness: 0.006,
  floorY: trayFloorY,
  rimY: trayFloorY + 0.03,
} as const;

/** The Rótulo on each drawer front, and the metal holder around it. */
export const LABEL = {
  width: 0.29,
  height: 0.1,
  y: DRAWER.height * 0.12,
  holderBorder: 0.008,
  holderDepth: 0.006,
} as const;

const carpetaHeight = 0.17;

/** A Carpeta standing in a tray, and the sheet inside it. Under the pointer both rise, the sheet further: out of the Carpeta. */
export const CARPETA = {
  /** A little narrower than the tray. */
  width: TRAY.width - 0.03,
  height: carpetaHeight,
  /** The cardboard of the back board, the tab and the front flap. */
  boardThickness: 0.003,
  /** The front flap is lower than the back board, so the sheet peeks over it. */
  flapHeight: carpetaHeight - 0.03,
  lift: 0.05,
  /** The tab on top of the back board, and the label printed on it. */
  tab: { width: 0.08, height: 0.022 },
  tabLabel: { width: 0.074, height: 0.0185 },
  /** The tabs go left, center or right, in turns: this far from the center. */
  tabOffset: 0.15,
  /** The sheet with the Documento's cover, standing this high off the Carpeta's bottom edge. */
  sheetWidth: TRAY.width - 0.06,
  sheetHeight: 0.15,
  sheetBottom: 0.012,
  sheetLift: 0.1,
  /** The first Carpeta stands this far behind the drawer front; the others spread out over `spread` behind it. */
  firstZ: 0.03,
  spread: DRAWER.slide.open - 0.08,
  /** Every Carpeta leans back this much (radians), give or take `leanJitter`, so they don't look lined up by machine. */
  lean: 0.1,
  leanJitter: 0.04,
} as const;
