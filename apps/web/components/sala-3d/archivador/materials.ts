import { BackSide, MeshStandardMaterial } from "three";

const darkInside = { color: 0x0c0c0c, roughness: 1 };

/** The materials, created once and shared by every piece. Their colors come from the theme (see paint.ts). */
export function createMaterials() {
  return {
    // Painted steel: a baked enamel, so only a little metallic.
    steel: new MeshStandardMaterial({ metalness: 0.3, roughness: 0.45 }),
    steelMatte: new MeshStandardMaterial({ metalness: 0.3, roughness: 0.6 }),
    chrome: new MeshStandardMaterial({ metalness: 0.95, roughness: 0.28 }),
    holder: new MeshStandardMaterial({ metalness: 0.85, roughness: 0.35 }),
    manila: new MeshStandardMaterial({ metalness: 0, roughness: 0.85 }),
    dark: new MeshStandardMaterial(darkInside),
    /** Seen from inside only: from outside, its faces aren't drawn at all. */
    darkLining: new MeshStandardMaterial({ ...darkInside, side: BackSide }),
  };
}

export type Materials = ReturnType<typeof createMaterials>;
