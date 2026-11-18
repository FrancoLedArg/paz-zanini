import { describe, expect, test } from "vitest";

import { trackList } from "./track";

// Three Lomos 40 px apart, centred at 100, 140 and 180 px on screen.
const CENTRES = [100, 140, 180];

describe("the 3D Pila follows the flat Pila under it", () => {
  test("the book whose Lomo crosses the canvas centre is in focus", () => {
    expect(trackList(CENTRES, 140)).toEqual({ index: 1, offset: 0 });
  });

  test("between two Lomos, focus passes from one to the next", () => {
    expect(trackList(CENTRES, 150)).toEqual({ index: 1.25, offset: 0 });
  });

  test("with the list still below the centre, the top book is in focus and the stack sits lower by the gap", () => {
    expect(trackList(CENTRES, 60)).toEqual({ index: 0, offset: 40 });
  });

  test("with the list scrolled past the centre, the bottom book is in focus and the stack sits higher", () => {
    expect(trackList(CENTRES, 230)).toEqual({ index: 2, offset: -50 });
  });

  test("an empty list puts nothing in focus and shifts nothing", () => {
    expect(trackList([], 300)).toEqual({ index: 0, offset: 0 });
  });
});
