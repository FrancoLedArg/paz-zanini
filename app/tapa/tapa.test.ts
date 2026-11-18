import { describe, expect, it } from "vitest";

import { MANUALES } from "../catalog/catalog";
import { contrastRatio, oklch } from "./color";
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

  it.each(MANUALES)(
    "$slug's colour reads as large text on the paper, for the home page's number",
    (manual) => {
      // --color-paper in app/app.css.
      const paper = oklch(0.955, 0.008, 85);

      expect(
        contrastRatio(tapaColors(manual).background, paper),
      ).toBeGreaterThanOrEqual(3);
    },
  );

  it("measures contrast the WCAG way", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21);
    expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
  });
});
