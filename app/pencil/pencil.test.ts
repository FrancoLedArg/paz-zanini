import { describe, expect, it } from "vitest";

import { underline } from "./pencil";

/** The x and y of each number pair in a path: start, two controls, end. */
const points = (d: string) => {
  const [x0 = 0, y0 = 0, , , , , x1 = 0, y1 = 0] = (
    d.match(/-?\d+(\.\d+)?/g) ?? []
  ).map(Number);
  return { start: [x0, y0] as const, end: [x1, y1] as const };
};

describe("a pencil underline", () => {
  it("is the same mark every time for the same seed, and another for another seed", () => {
    expect(underline(120, 4)).toBe(underline(120, 4));
    expect(underline(120, 4)).not.toBe(underline(120, 5));
  });

  it("runs the width of its name, a hand's slip past each end, and rises a touch to the right", () => {
    for (const seed of [1, 2, 3, 7, 11]) {
      const { start, end } = points(underline(120, seed));
      expect(start[0]).toBeGreaterThan(-4);
      expect(start[0]).toBeLessThan(0);
      expect(end[0]).toBeGreaterThan(119);
      expect(end[0]).toBeLessThan(125);
      // y grows downward: the end sits higher than the start, by at most the bow's 2.5 px and the hand's jitter.
      expect(end[1]).toBeLessThan(start[1] + 1.2);
      expect(start[1] - end[1]).toBeLessThan(3.8);
    }
  });
});
