import { describe, expect, it } from "vitest";

import { MANUALES } from "../catalog/catalog";
import { contrastRatio } from "./color";
import { tapaColors, tapaDesign } from "./tapa";

describe("Tapa design", () => {
  it.each(MANUALES)(
    "$slug has designed title lines that read as its catalog title",
    (manual) => {
      expect(tapaDesign(manual).lines.join(" ")).toBe(manual.title);
    },
  );
});

describe("Tapa colours", () => {
  it.each(MANUALES)(
    "$slug keeps its text at WCAG AA contrast on its background",
    (manual) => {
      const { background, text, muted } = tapaColors(manual);

      expect(contrastRatio(text, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(muted, background)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("measures contrast the WCAG way", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21);
    expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
  });
});
