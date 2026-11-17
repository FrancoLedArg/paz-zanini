import { describe, expect, it } from "vitest";

import { CASE_HEIGHT, caseGeometry } from "./geometry";

const THICKNESS = 0.4;

/** The vertex normal at the vertex nearest a point in book space. */
function normalNear(x: number, y: number, z: number) {
  const { geometry } = caseGeometry(THICKNESS);
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < position.count; i++) {
    const distance = Math.hypot(
      position.getX(i) - x,
      position.getY(i) - y,
      position.getZ(i) - z,
    );
    if (distance < bestDistance) [best, bestDistance] = [i, distance];
  }
  return [normal.getX(best), normal.getY(best), normal.getZ(best)];
}

describe("the cover case is a closed solid facing outward", () => {
  it("the front cover faces the front", () => {
    const [, , z = 0] = normalNear(0, 0, THICKNESS / 2);
    expect(z).toBeGreaterThan(0.99);
  });

  it("the back cover faces the back", () => {
    const [, , z = 0] = normalNear(0, 0, -THICKNESS / 2);
    expect(z).toBeLessThan(-0.99);
  });

  it("the spine faces away from the fore-edge", () => {
    const [x = 0] = normalNear(-2, 0, 0);
    expect(x).toBeLessThan(-0.99);
  });

  // The cap shares its edge with the bevel, so the nearest vertex may lean slightly.
  it("the head faces up and the tail faces down", () => {
    const [, head = 0] = normalNear(0.5, CASE_HEIGHT / 2, THICKNESS / 2 - 0.01);
    const [, tail = 0] = normalNear(
      0.5,
      -CASE_HEIGHT / 2,
      THICKNESS / 2 - 0.01,
    );
    expect(head).toBeGreaterThan(0.95);
    expect(tail).toBeLessThan(-0.95);
  });

  it("the board edges form their own group, for the rim material", () => {
    const { geometry } = caseGeometry(THICKNESS);
    expect(geometry.groups.map((group) => group.materialIndex)).toEqual([0, 1]);
    expect(geometry.groups[1]?.count).toBeGreaterThan(0);
  });
});
