import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { MANUALES } from "../catalog/catalog";
import { contrastRatio, oklch } from "./color";
import { tapaColors, tapaDesign } from "./tapa";

describe("Tapa design", () => {
  it.each(MANUALES)(
    "$slug has designed title parts that read as its catalog title",
    (manual) => {
      const { kicker, main, tail } = tapaDesign(manual);
      const parts = [kicker, ...main, tail].filter(Boolean).join(" ");

      // A kicker capitalises the line under it ("a la" / "Obstetricia").
      expect(parts.toLowerCase()).toBe(manual.title.toLowerCase());
    },
  );
});

// The page's --color-paper token, read from app/app.css so the test follows it.
const PAPER = (/--color-paper: oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)/
  .exec(readFileSync(join(import.meta.dirname, "../app.css"), "utf8"))
  ?.slice(1)
  .map(Number) ?? []) as [number, number, number];

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
    "$slug keeps its caption and labels at WCAG AA contrast on the cream field",
    (manual) => {
      const { ink, paper } = tapaColors(manual);

      expect(contrastRatio(ink, paper)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(MANUALES)(
    "$slug's colour reads as large text on the paper, for the home page's number",
    (manual) => {
      const paper = oklch(...PAPER);

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
