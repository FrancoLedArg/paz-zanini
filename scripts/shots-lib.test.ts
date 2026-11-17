import { describe, expect, it } from "vitest";

import { frameStats, screenshotName } from "./shots-lib";

describe("screenshotName", () => {
  it("names the home page after the viewport", () => {
    expect(screenshotName("phone", "/")).toBe("phone-home.png");
  });

  it("turns a path with search params into a flat file name", () => {
    expect(screenshotName("desktop", "/manuales/aed-r?pose=spine")).toBe(
      "desktop-manuales-aed-r-pose-spine.png",
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
