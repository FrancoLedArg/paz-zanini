import assert from "node:assert/strict";
import { test } from "node:test";
import { rangeLabel } from "./archivo.ts";

test("a range with one prefix shortens its end to the number", () => {
  assert.equal(rangeLabel(["EST-01", "EST-02", "EST-06"]), "EST-01 – 06 · n = 3");
});

test("a range across prefixes shows its end in full", () => {
  assert.equal(rangeLabel(["PUB-01", "PON-01", "PRY-04"]), "PUB-01 – PRY-04 · n = 3");
});
