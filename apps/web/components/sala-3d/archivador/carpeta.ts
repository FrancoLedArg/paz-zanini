import { Group, Mesh, MeshStandardMaterial } from "three";
import { damped, FAST, type Damped } from "../damped";
import { canvasTexture, type CanvasTex } from "../textures";
import type { CarpetaData } from "../types";
import type { Geometries } from "./geometries";
import type { Materials } from "./materials";
import { CARPETA, PRINT_OFFSET, TRAY } from "./measures";
import { mesh } from "./parts";

/** A Carpeta in the scene: its meshes, where they rest, and how far they're lifted. */
export interface CarpetaMesh {
  data: CarpetaData;
  group: Group;
  baseY: number;
  lift: Damped;
  sheet: Mesh;
  sheetBaseY: number;
  sheetLift: Damped;
  /** Canvases drawn later, in paint.ts. */
  tab: CanvasTex;
  cover: CanvasTex;
}

/**
 * The `index`-th of `count` Carpetas in a drawer, front to back: a back board with its tab, the sheet with the
 * Documento's cover, and a lower front flap the sheet peeks over.
 */
export function buildCarpeta(data: CarpetaData, index: number, count: number, g: Geometries, m: Materials): CarpetaMesh {
  const { boardThickness } = CARPETA;
  const group = new Group();
  // Spread over the part of the tray that slides out, so all of them show in an open drawer.
  const z = -CARPETA.firstZ - (index * CARPETA.spread) / Math.max(1, count - 1);
  group.position.set(0, TRAY.floorY + TRAY.floorThickness, z); // standing on the tray's floor
  group.rotation.x = -CARPETA.lean + Math.sin(index * 2.3) * CARPETA.leanJitter; // each one leaning a little differently

  // The back board, and its tab: left, center or right, in turns.
  const tabX = ((index % 3) - 1) * CARPETA.tabOffset;
  const tabY = CARPETA.height + CARPETA.tab.height / 2;
  group.add(mesh(g.carpetaBoard, m.manila, 0, CARPETA.height / 2, 0));
  group.add(mesh(g.carpetaTab, m.manila, tabX, tabY, 0));
  const tab = canvasTexture(160, 40);
  const tabLabel = new Mesh(g.tabLabel, new MeshStandardMaterial({ map: tab.texture, roughness: 0.85 }));
  tabLabel.position.set(tabX, tabY, boardThickness / 2 + PRINT_OFFSET);
  group.add(tabLabel);

  // The sheet with the cover, just in front of the back board.
  const cover = canvasTexture(512, 202);
  const sheetMaterial = new MeshStandardMaterial({ map: cover.texture, roughness: 0.9 });
  const sheet = mesh(g.sheet, sheetMaterial, 0, CARPETA.sheetBottom + CARPETA.sheetHeight / 2, boardThickness);
  group.add(sheet);

  // The front flap, in front of the sheet.
  group.add(mesh(g.carpetaFlap, m.manila, 0, CARPETA.flapHeight / 2, 2 * boardThickness));

  return {
    data,
    group,
    baseY: group.position.y,
    lift: damped(FAST),
    sheet,
    sheetBaseY: sheet.position.y,
    sheetLift: damped(FAST),
    tab,
    cover,
  };
}
