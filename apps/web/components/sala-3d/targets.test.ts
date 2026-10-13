import assert from "node:assert/strict";
import { test } from "node:test";
import { CARPETA, DRAWER } from "./archivador/measures.ts";
import { damped, FAST, SLOW } from "./damped.ts";
import { setTargets, type Aim, type DrawerMotion } from "./targets.ts";

/** Five drawers spaced like the real ones, two Carpetas each, everything at rest. */
function setUp() {
  const drawers: DrawerMotion[] = Array.from({ length: 5 }, (_, i) => ({
    y: 1 - i * (DRAWER.height + DRAWER.gap),
    slide: damped(SLOW),
    carpetas: [0, 1].map(() => ({ lift: damped(FAST), sheetLift: damped(FAST) })),
  }));
  const aim: Aim = { y: damped(FAST), z: damped(FAST), tilt: damped(SLOW) };
  return { drawers, aim };
}
const nothingOpen = { open: -1, hover: -1, carpeta: -1 };
/** Each drawer's slide target, rounded to a micrometer so float noise doesn't fail the comparison. */
const slides = (drawers: DrawerMotion[]) => drawers.map((d) => Math.round(d.slide.target * 1e6) / 1e6);

test("scrolling walks the camera down: the drawer in front of it stands ajar", () => {
  const { drawers, aim } = setUp();
  setTargets(drawers, aim, nothingOpen, 0);
  assert.deepEqual(slides(drawers), [DRAWER.slide.ajar, 0, 0, 0, 0]);
  setTargets(drawers, aim, nothingOpen, 1);
  assert.deepEqual(slides(drawers), [0, 0, 0, 0, DRAWER.slide.ajar]);
  assert.equal(aim.tilt.target, 0);
});

test("the drawer under the pointer peeks out", () => {
  const { drawers, aim } = setUp();
  setTargets(drawers, aim, { ...nothingOpen, hover: 2 }, 0);
  assert.equal(drawers[2].slide.target, DRAWER.slide.peek);
});

test("an open drawer slides out, lifts the Carpeta under the pointer, and the camera leans over it, slowly", () => {
  const { drawers, aim } = setUp();
  setTargets(drawers, aim, { open: 1, hover: -1, carpeta: 0 }, 0);
  assert.equal(drawers[1].slide.target, DRAWER.slide.open);
  assert.equal(drawers[1].carpetas[0].lift.target, CARPETA.lift);
  assert.equal(drawers[1].carpetas[0].sheetLift.target, CARPETA.sheetLift);
  assert.equal(drawers[1].carpetas[1].lift.target, 0);
  assert.equal(drawers[0].carpetas[0].lift.target, 0); // same index, closed drawer
  assert.equal(aim.y.target, drawers[1].y);
  assert.equal(aim.tilt.target, 1);
  assert.equal(aim.y.rate, SLOW);
});
