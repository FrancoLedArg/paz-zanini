import { Raycaster, Vector2, type Camera, type Object3D } from "three";
import type { CajonMesh } from "./archivador/cajon";
import { ndc } from "./view";

/** What's under the pointer. -1 means nothing. */
export interface Picked {
  cajon: number;
  /** Only Carpetas of the open drawer count. */
  carpeta: number;
}

/** Whether `object` is `group` or one of its descendants. */
function isPartOf(object: Object3D | null | undefined, group: Object3D) {
  for (let o = object; o; o = o.parent) {
    if (o === group) return true;
  }
  return false;
}

/** Returns `pick`, which finds the drawer and Carpeta under a pointer event inside `slot`. */
export function createPicker(camera: Camera, cajones: CajonMesh[]) {
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const targets = cajones.map((c) => c.group);

  return function pick(e: MouseEvent, slot: HTMLElement, openCajon: number): Picked {
    const p = ndc(e.clientX, e.clientY, slot.getBoundingClientRect());
    raycaster.setFromCamera(pointer.set(p.x, p.y), camera);
    const hit = raycaster.intersectObjects(targets)[0]?.object;
    const cajon = cajones.findIndex((c) => isPartOf(hit, c.group));
    const carpeta = openCajon < 0 ? -1 : cajones[openCajon].carpetas.findIndex((k) => isPartOf(hit, k.group));
    return { cajon, carpeta };
  };
}
