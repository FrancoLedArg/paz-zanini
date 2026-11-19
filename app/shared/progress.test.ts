import { expect, it, vi } from "vitest";

import { loadProgress, reportProgress, subscribeToProgress } from "./progress";

it("the 3D layer's progress only moves forward, up to done, and tells its listeners", () => {
  const listener = vi.fn();
  const unsubscribe = subscribeToProgress(listener);

  reportProgress(0.5);
  reportProgress(0.3);
  expect(loadProgress()).toBe(0.5);
  reportProgress(2);
  expect(loadProgress()).toBe(1);
  expect(listener).toHaveBeenCalledTimes(2);

  unsubscribe();
  reportProgress(1);
  expect(listener).toHaveBeenCalledTimes(2);
});
