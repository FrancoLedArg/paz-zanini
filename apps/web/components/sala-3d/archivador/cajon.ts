import { Group, Mesh, MeshStandardMaterial } from "three";
import { damped, SLOW, type Damped } from "../damped";
import { canvasTexture, type CanvasTex } from "../textures";
import type { CarpetaData } from "../types";
import { buildCarpeta, type CarpetaMesh } from "./carpeta";
import type { Geometries } from "./geometries";
import type { Materials } from "./materials";
import { CABINET, DRAWER, DRAWER_FRONT, HAIR, HANDLE, LABEL, PRINT_OFFSET, TRAY } from "./measures";
import { mesh } from "./parts";

/** A drawer in the scene: its meshes, its height, how far it's slid out, and its Carpetas. */
export interface CajonMesh {
  group: Group;
  /** The drawer's center height, which the camera scrolls past. */
  y: number;
  slide: Damped;
  /** A canvas drawn later, in paint.ts. */
  rotulo: CanvasTex;
  carpetas: CarpetaMesh[];
}

/** Drawer `index` (0 = top), closed: its front with handle and Rótulo, the tray behind it, and its Carpetas. */
export function buildCajon(index: number, carpetas: CarpetaData[], g: Geometries, m: Materials): CajonMesh {
  const group = new Group();
  const y = CABINET.height - CABINET.topThickness - DRAWER.gap - DRAWER.height / 2 - index * (DRAWER.height + DRAWER.gap);
  group.position.set(0, y, CABINET.depth / 2);

  group.add(mesh(g.drawerFront, m.steel, 0, 0, DRAWER_FRONT.thickness / 2));
  group.add(mesh(g.handle, m.chrome, 0, HANDLE.y, HANDLE.z));
  group.add(...tray(g, m));

  const rotulo = canvasTexture(512, 182);
  group.add(...labelInHolder(rotulo, g, m));

  const carpetaMeshes = carpetas.map((data, j) => buildCarpeta(data, j, carpetas.length, g, m));
  group.add(...carpetaMeshes.map((c) => c.group));

  return { group, y, slide: damped(SLOW), rotulo, carpetas: carpetaMeshes };
}

/** The tray: a floor, two sides and a back, open at the top. */
function tray(g: Geometries, m: Materials) {
  const { width, depth, wallThickness, floorThickness, floorY, rimY } = TRAY;
  const wallY = (rimY + floorY) / 2;
  const floor = mesh(g.trayFloor, m.steelMatte, 0, floorY + floorThickness / 2, -depth / 2);
  const sides = [-1, 1].map((side) => mesh(g.traySide, m.steelMatte, side * (width / 2 - wallThickness / 2), wallY, -depth / 2));
  const back = mesh(g.trayBack, m.steelMatte, 0, wallY, -depth + wallThickness / 2);
  return [floor, ...sides, back];
}

/** The Rótulo, a canvas on a plane, printed on the front of its metal holder. */
function labelInHolder(rotulo: CanvasTex, g: Geometries, m: Materials) {
  const holderZ = DRAWER_FRONT.thickness + HAIR;
  const holder = mesh(g.labelHolder, m.holder, 0, LABEL.y, holderZ);
  // A little grey, so the white paper doesn't glare under the lamp.
  const label = new Mesh(g.label, new MeshStandardMaterial({ map: rotulo.texture, roughness: 0.85, color: 0xc4c4c4 }));
  label.position.set(0, LABEL.y, holderZ + LABEL.holderDepth / 2 + PRINT_OFFSET);
  return [holder, label];
}
