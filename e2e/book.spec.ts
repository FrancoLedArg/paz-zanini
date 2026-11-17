import { type CDPSession, expect, type Page, test } from "@playwright/test";

import { coverage, errorsOn } from "./browser";

const PATH = "/manuales/estadistica-descriptiva-desde-cero";
const TAPA = "Tapa de Estadística descriptiva desde cero";

/** The 3D book, once its shaders are compiled and it has faded in over the Tapa. */
async function shownBook(page: Page) {
  const stage = page.locator('[aria-busy="false"]');
  await expect(stage).toHaveCSS("opacity", "1", { timeout: 20_000 });
  return page.locator("canvas");
}

interface Point {
  x: number;
  y: number;
}

/** A one-finger touch drag through the browser's own input pipeline, so native scrolling applies. */
async function touchDrag(cdp: CDPSession, from: Point, to: Point) {
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [from],
  });
  for (let step = 1; step <= 10; step++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          x: from.x + ((to.x - from.x) * step) / 10,
          y: from.y + ((to.y - from.y) * step) / 10,
        },
      ],
    });
  }
}

const touchEnd = (cdp: CDPSession) =>
  cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

test("the 3D book fades in over the Tapa without shifting the page", async ({
  page,
}) => {
  await page.goto(PATH);

  await expect(await shownBook(page)).toBeVisible();
  // The Tapa stays under the canvas: it names the book for assistive tech.
  await expect(page.getByRole("img", { name: TAPA })).toBeAttached();
  // Every layout shift since navigation: a buffered observer replays them all.
  const shift = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let total = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries())
            if ("value" in entry && typeof entry.value === "number")
              total += entry.value;
        }).observe({ type: "layout-shift", buffered: true });
        setTimeout(() => {
          resolve(total);
        }, 200);
      }),
  );
  expect(shift).toBeLessThan(0.1);
  expect(await errorsOn(page)).toEqual([]);
});

test("a sideways drag turns the book and springs back; a vertical swipe scrolls the page", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "touch journey: phone viewport");
  await page.goto(PATH);
  const book = await shownBook(page);
  const box = await book.boundingBox();
  if (!box) throw new Error("the book has no box");
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const cdp = await page.context().newCDPSession(page);
  // Once faded in, the book turns from facing front to its hero pose; let that settle first.
  await page.waitForTimeout(1500);

  const rest = await book.screenshot();
  await touchDrag(cdp, centre, { x: centre.x + 120, y: centre.y });
  await page.waitForTimeout(600);
  const turned = await book.screenshot();
  await touchEnd(cdp);
  await page.waitForTimeout(2000);
  const settled = await book.screenshot();

  // Turned, the book shows its narrow spine instead of its cover; released, it settles back.
  const atRest = await coverage(page, rest);
  const atTurn = await coverage(page, turned);
  const atSettle = await coverage(page, settled);
  expect(atTurn).toBeLessThan(atRest * 0.7);
  expect(atSettle).toBeCloseTo(atRest, 1);
  expect(await page.evaluate(() => scrollY)).toBe(0);

  await touchDrag(cdp, centre, { x: centre.x, y: centre.y - 300 });
  await touchEnd(cdp);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
});

test.describe("under reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the book rests still, even when dragged", async ({ page }) => {
    await page.goto(PATH);
    const book = await shownBook(page);
    const box = await book.boundingBox();
    if (!box) throw new Error("the book has no box");

    const first = await book.screenshot();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, {
      steps: 10,
    });
    await page.waitForTimeout(600);
    const later = await book.screenshot();
    await page.mouse.up();

    expect(later.equals(first)).toBe(true);
  });
});

test("when the WebGL context is lost the SVG Tapa takes the book's place", async ({
  page,
}) => {
  await page.goto(PATH);
  await shownBook(page);

  await page.evaluate(() => {
    const gl = document.querySelector("canvas")?.getContext("webgl2");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  });

  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.getByRole("img", { name: TAPA })).toBeVisible();
});
