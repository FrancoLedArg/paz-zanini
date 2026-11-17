import { describe, expect, it } from "vitest";

import { frameStats, screenshotName } from "./shots-lib";

describe("screenshotName", () => {
  it("names the home page's first screen after the viewport", () => {
    expect(screenshotName("phone", "/", 1)).toBe("phone-home-1.png");
  });

  it("turns a path with search params into a flat file name", () => {
    expect(screenshotName("desktop", "/manuales/aed-r?pose=spine", 3)).toBe(
      "desktop-manuales-aed-r-pose-spine-3.png",
    );
  });
});

describe("frameStats", () => {
  it("reports average fps and the worst frame", () => {
    expect(frameStats([0, 16, 32, 82])).toEqual({
      averageFps: (1000 * 3) / 82,
      worstFrameMs: 50,
    });
  });

  it("returns null when there are too few frames to measure", () => {
    expect(frameStats([])).toBeNull();
    expect(frameStats([5])).toBeNull();
  });
});
