import { afterEach, describe, expect, it, vi } from "vitest";

import { inItsOwnFrame } from "./textures";

describe("drawing covers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("draws one piece of a cover per frame, and a failed piece doesn't stall the rest", async () => {
    let frame = 0;
    const waiting: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      waiting.push(callback);
      return waiting.length;
    });
    const nextFrame = async () => {
      // Let the queue ask for the frame first.
      await new Promise((resolve) => setTimeout(resolve));
      frame++;
      for (const callback of waiting.splice(0)) callback(frame);
    };

    const drawnIn: number[] = [];
    const first = inItsOwnFrame(() => drawnIn.push(frame));
    const failed = inItsOwnFrame(() => {
      throw new Error("No engraving");
    });
    const last = inItsOwnFrame(() => drawnIn.push(frame));
    for (let i = 0; i < 3; i++) await nextFrame();

    await expect(first).resolves.toBe(1);
    await expect(failed).rejects.toThrow("No engraving");
    await expect(last).resolves.toBe(2);
    expect(drawnIn).toEqual([1, 3]);
  });
});
