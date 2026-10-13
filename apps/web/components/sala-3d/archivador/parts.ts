import { Mesh } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/** A box with rounded edges (see ROUNDING in measures.ts): the shape of nearly every piece of the Archivador. */
export function roundedBox(width: number, height: number, depth: number, radius: number) {
  return new RoundedBoxGeometry(width, height, depth, 3, radius);
}

/** A solid piece at (x, y, z), relative to the group it's added to. It casts and receives shadows. */
export function mesh(geometry: Mesh["geometry"], material: Mesh["material"], x = 0, y = 0, z = 0) {
  const part = new Mesh(geometry, material);
  part.position.set(x, y, z);
  part.castShadow = true;
  part.receiveShadow = true;
  return part;
}
