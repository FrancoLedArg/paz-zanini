import { Group, Mesh, MeshBasicMaterial, PlaneGeometry } from "three";
import { floorShadowTexture } from "../textures";
import type { Materials } from "./materials";
import { CABINET, DRAWER, HAIR, PLINTH, ROUNDING } from "./measures";
import { mesh, roundedBox } from "./parts";

const bodyHeight = CABINET.height - CABINET.baseHeight;
const bodyY = CABINET.baseHeight + bodyHeight / 2;
/** The top of the cabinet's floor, which sinks a hair into the plinth. */
const floorTop = CABINET.baseHeight + CABINET.floorThickness - HAIR;

/**
 * The cabinet without its drawers: a shell open at the front, with rails between the drawers,
 * so an open drawer leaves a hole you can look into.
 */
export function buildShell(m: Materials) {
  const shell = new Group();
  shell.add(...walls(m), ...railsAndShelves(m), lining(m), lip(m));
  shell.add(mesh(roundedBox(PLINTH.width, CABINET.baseHeight, PLINTH.depth, ROUNDING.wall), m.steelMatte, 0, CABINET.baseHeight / 2, PLINTH.z));
  shell.add(floorShadow(CABINET.width * 2, CABINET.depth * 1.8));
  return shell;
}

/** Two sides, the back, the top and the floor. */
function walls(m: Materials) {
  const { width, height, depth, wallThickness, topThickness, floorThickness } = CABINET;
  const side = roundedBox(wallThickness, bodyHeight, depth, ROUNDING.wall); // one shape for both sides
  const sides = [-1, 1].map((x) => mesh(side, m.steel, x * (width / 2 - wallThickness / 2), bodyY, 0));
  const back = mesh(roundedBox(width, bodyHeight, wallThickness, ROUNDING.wall), m.steel, 0, bodyY, -depth / 2 + wallThickness / 2);
  const top = mesh(roundedBox(width, topThickness, depth, ROUNDING.wall), m.steel, 0, height - topThickness / 2, 0);
  const floor = mesh(roundedBox(width, floorThickness, depth, ROUNDING.sheet), m.steel, 0, floorTop - floorThickness / 2, 0);
  return [...sides, back, top, floor];
}

/** The lip around the top: the upper part of the top, sticking out a little past the walls. */
function lip(m: Materials) {
  const { width, height, depth, topThickness, lipOverhang } = CABINET;
  const lipHeight = topThickness * 0.6;
  const box = roundedBox(width + 2 * lipOverhang, lipHeight, depth + 2 * lipOverhang, ROUNDING.front);
  return mesh(box, m.steel, 0, height - lipHeight / 2, 0);
}

/** Between two drawers: a steel rail at the front and a dark shelf behind it, so an open drawer doesn't show the one below. */
function railsAndShelves(m: Materials) {
  const { width, depth, height, topThickness, wallThickness } = CABINET;
  // The shelf runs from the back wall to just behind the rail, a hair clear of the side walls.
  const shelfBack = -depth / 2 + wallThickness;
  const shelfFront = depth / 2 - DRAWER.railDepth - 2 * HAIR;
  const rail = roundedBox(width, DRAWER.gap, DRAWER.railDepth, ROUNDING.sheet);
  const shelf = roundedBox(width - 2 * wallThickness - 2 * HAIR, DRAWER.gap, shelfFront - shelfBack, ROUNDING.sheet);

  const pieces: Mesh[] = [];
  for (let i = 1; i < DRAWER.count; i++) {
    const y = height - topThickness - i * (DRAWER.height + DRAWER.gap) - DRAWER.gap / 2;
    pieces.push(mesh(rail, m.steel, 0, y, depth / 2 - DRAWER.railDepth / 2));
    pieces.push(mesh(shelf, m.dark, 0, y, (shelfBack + shelfFront) / 2));
  }
  return pieces;
}

/** The dark inside: a box lining the shell, drawn from within, a hair smaller than the space between the walls. */
function lining(m: Materials) {
  const { width, depth, topThickness, wallThickness, floorThickness } = CABINET;
  const innerHeight = bodyHeight - topThickness - floorThickness;
  const box = roundedBox(width - 2 * wallThickness - HAIR, innerHeight, depth - wallThickness - HAIR, ROUNDING.sheet);
  const inside = mesh(box, m.darkLining, 0, floorTop + innerHeight / 2, wallThickness / 2);
  inside.castShadow = false;
  return inside;
}

/** A soft shadow painted on the floor: cheaper and softer than a real one. */
function floorShadow(width: number, depth: number) {
  const material = new MeshBasicMaterial({ map: floorShadowTexture(), transparent: true, depthWrite: false });
  const plane = new Mesh(new PlaneGeometry(width, depth), material);
  plane.rotation.x = -Math.PI / 2; // lying flat
  plane.position.y = 0.001; // just above the floor
  return plane;
}
