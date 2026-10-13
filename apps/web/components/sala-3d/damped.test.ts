import assert from "node:assert/strict";
import { test } from "node:test";
import { damped, FAST, SLOW, step } from "./damped.ts";

test("a damped value glides toward its target and lands on it exactly", () => {
  const d = { ...damped(FAST), target: 1 };
  assert.equal(step(d, 1 / 60, false), true);
  assert.ok(d.value > 0 && d.value < 1);
  let frames = 1;
  while (step(d, 1 / 60, false)) frames++;
  assert.equal(d.value, 1);
  assert.ok(frames < 120, `took ${frames} frames`);
});

test("a slower rate covers less ground in the same time", () => {
  const fast = { ...damped(FAST), target: 1 };
  const slow = { ...damped(SLOW), target: 1 };
  step(fast, 0.1, false);
  step(slow, 0.1, false);
  assert.ok(slow.value < fast.value);
});

test("with reduced motion it jumps straight to its target", () => {
  const d = { ...damped(SLOW), target: 0.42 };
  assert.equal(step(d, 1 / 60, true), false);
  assert.equal(d.value, 0.42);
});

test("no time passed, no movement", () => {
  const d = { ...damped(FAST), target: 1 };
  step(d, 0, false);
  assert.equal(d.value, 0);
});
