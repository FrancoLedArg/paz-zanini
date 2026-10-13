import assert from "node:assert/strict";
import { test } from "node:test";
import { ndc, progress, viewport } from "./view.ts";

const slot = { left: 100, top: 50, width: 200, height: 400 };

test("a slot becomes a viewport counted from the bottom of the canvas", () => {
  assert.deepEqual(viewport(slot, 1000, 800), { x: 100, y: 350, w: 200, h: 400 });
});

test("a slot scrolled past the canvas has no viewport", () => {
  assert.equal(viewport({ ...slot, top: -500 }, 1000, 800), null);
  assert.equal(viewport({ ...slot, top: 800 }, 1000, 800), null);
  assert.equal(viewport({ ...slot, left: 1000 }, 1000, 800), null);
});

test("a pointer maps to the slot's normalized device coordinates", () => {
  assert.deepEqual(ndc(100, 50, slot), { x: -1, y: 1 });
  assert.deepEqual(ndc(200, 250, slot), { x: 0, y: 0 });
  assert.deepEqual(ndc(300, 450, slot), { x: 1, y: -1 });
});

test("scroll progress runs 0 → 1 over the element's extra height, clamped", () => {
  const r = (top: number) => ({ left: 0, top, width: 1000, height: 3000 });
  assert.equal(progress(r(40), 1000), 0);
  assert.equal(progress(r(-1000), 1000), 0.5);
  assert.equal(progress(r(-2000), 1000), 1);
  assert.equal(progress(r(-2500), 1000), 1);
});
