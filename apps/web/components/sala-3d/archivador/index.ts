// Builds the Archivador's meshes: the cabinet, its drawers, and the Carpetas in them.
// Nothing here moves or listens to anything; scene.ts animates what this returns.
import type { Group } from "three";
import type { CajonData } from "../types";
import { buildCajon, type CajonMesh } from "./cajon";
import { createGeometries } from "./geometries";
import type { Materials } from "./materials";
import { DRAWER } from "./measures";
import { buildShell } from "./shell";

export interface Archivador {
  group: Group;
  /** Top to bottom. */
  cajones: CajonMesh[];
}

/** The whole Archivador, with `cajones[i]` filling drawer i from the top. */
export function buildArchivador(cajones: CajonData[], m: Materials): Archivador {
  const group = buildShell(m);
  const geometries = createGeometries();
  const drawers = Array.from({ length: DRAWER.count }, (_, i) => buildCajon(i, cajones[i]?.carpetas ?? [], geometries, m));
  group.add(...drawers.map((d) => d.group));
  return { group, cajones: drawers };
}
