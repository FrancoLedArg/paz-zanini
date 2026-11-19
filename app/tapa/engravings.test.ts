import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { MANUALES } from "../catalog/catalog";
import PLATES from "./engravings.json";

const MASKS = join(import.meta.dirname, "../../public/engravings");

const plateOf = (slug: string) =>
  PLATES.filter((plate) => plate.manuales.includes(slug));

describe("engravings", () => {
  it.each(MANUALES)("$slug has exactly one engraving", (manual) => {
    expect(plateOf(manual.slug)).toHaveLength(1);
  });

  it.each(MANUALES.filter((manual) => manual.par))(
    "$slug shares its engraving with its Par",
    (manual) => {
      expect(plateOf(manual.slug)).toEqual(plateOf(manual.par ?? ""));
    },
  );

  it.each(PLATES)(
    "$id is a public-domain plate with its mask, caption and credits",
    (plate) => {
      expect(existsSync(join(MASKS, `${plate.id}.jpg`))).toBe(true);
      expect(plate.source.licence).toMatch(/^(Public domain|CC0)$/);
      expect(plate.source.title).toMatch(/^File:/);
      expect(plate.source.author).not.toBe("");
      expect(plate.source.date).not.toBe("");
      expect(plate.caption).not.toBe("");
    },
  );

  it("ships no mask without a plate", () => {
    const masks = readdirSync(MASKS)
      .filter((file) => file.endsWith(".jpg"))
      .sort();

    expect(masks).toEqual(PLATES.map((plate) => `${plate.id}.jpg`).sort());
  });
});
