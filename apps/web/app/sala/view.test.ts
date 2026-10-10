import assert from "node:assert/strict";
import { test } from "node:test";
import { ndc, topDown, viewport } from "./view.ts";

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

test("a top-down camera lands a world span on the DOM rect: width across, back edge on its top", async () => {
  const { PerspectiveCamera, Vector3 } = await import("three");
  const r = { left: 300, top: 220, width: 728, height: 900 };
  const plane = { x0: -0.22, x1: 0.22, y: 0.9, z: 0.32 };
  const cam = new PerspectiveCamera(20, 1360 / 800, 0.05, 30);
  const p = topDown(r, plane, 1360, 800, 20);
  cam.position.set(p.x, p.y, p.z);
  cam.rotation.x = -Math.PI / 2;
  cam.updateMatrixWorld();
  const px = (x: number) => {
    const v = new Vector3(x, plane.y, plane.z).project(cam);
    return [Math.round(((v.x + 1) / 2) * 1360), Math.round(((1 - v.y) / 2) * 800)];
  };
  assert.deepEqual(px(plane.x0), [300, 220]);
  assert.deepEqual(px(plane.x1), [1028, 220]);
});
