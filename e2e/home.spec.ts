import { expect, type Locator, type Page, test } from "@playwright/test";

import {
  coleccionesWithCount,
  manualesIn,
  manualPath,
} from "../app/catalog/catalog";
import {
  errorsOn,
  loseWebGL,
  layoutShift,
  offCentre,
  scrollToStep,
  shown3d,
  sideways,
  skipLoader,
  tapBook,
  track,
  trackLinks,
  words,
} from "./browser";

// These journeys are the page itself; the first-visit cover has its own spec (loader.spec.ts).
test.beforeEach(({ context }) => skipLoader(context));

/** Waits two frames: one for the scroll event, one for React to draw what it read. Never a timer. */
const twoFrames = (page: Page) =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
  );

// The home page is Colección I's Hélice.
const HOME_MANUALES = manualesIn("estadistica-desde-cero");

const logo = (page: Page) =>
  page.getByRole("banner").getByRole("link", { name: "Raúl E. Paz Zanini" });
const LICENSE = "CC BY-NC-SA 4.0";
const licenseCount = async (page: Page) =>
  (await page.locator("body").innerText()).split(LICENSE).length - 1;

type Box = Pick<DOMRect, "top" | "bottom" | "left" | "right">;

const apart = (a: Box, b: Box) =>
  a.bottom <= b.top ||
  a.top >= b.bottom ||
  a.right <= b.left ||
  a.left >= b.right;

/** Each line of the words of the book in focus, as drawn. */
const wordLines = (page: Page) =>
  words(page)
    .locator("p")
    .evaluateAll((lines) =>
      lines.map((line) => line.getBoundingClientRect().toJSON() as Box),
    );

/** How opaque an element is drawn: its opacity times every ancestor's. */
const shownOpacity = (element: Locator) =>
  element.evaluate((node) => {
    let opacity = 1;
    for (let el: Element | null = node; el; el = el.parentElement)
      opacity *= Number(getComputedStyle(el).opacity);
    return opacity;
  });

/** The number the words' odometer shows: of its column of numbers, the one at the top of its window. */
const visibleNumber = (page: Page) =>
  words(page).evaluate((region) => {
    const window = region.querySelector("[aria-hidden=true]");
    if (!window) return null;
    const top = window.getBoundingClientRect().top;
    for (const number of window.querySelectorAll(":scope > span > span"))
      if (Math.abs(number.getBoundingClientRect().top - top) < 1)
        return number.textContent;
    return null;
  });

/** Scrolls the home page to a step, then a fraction of a step further, and waits for the words to follow. */
async function scrollOffStep(page: Page, index: number, fraction: number) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await scrollToStep(step(page, index));
  const height = await step(page, 0).evaluate(
    (li) => li.getBoundingClientRect().height,
  );
  await page.evaluate((y) => {
    scrollBy({ top: y, behavior: "instant" });
  }, height * fraction);
  await twoFrames(page);
}

const step = (page: Page, index: number) =>
  track(page).getByRole("listitem").nth(index);
const inferencial = (page: Page) =>
  track(page).getByRole("link", { name: "Estadística inferencial desde cero" });

test.describe("the prerendered page, before any script runs", () => {
  test.use({ javaScriptEnabled: false });

  for (const { id, name, path, count } of coleccionesWithCount())
    test(`${path} links only ${name}'s Manuales by their titles, in catalog order, under its own title`, async ({
      page,
    }) => {
      await page.goto(path);

      const links = await trackLinks(page).evaluateAll((elements) =>
        elements.map((link) => [
          link.getAttribute("aria-label"),
          link.getAttribute("href"),
        ]),
      );
      expect(links).toEqual(
        manualesIn(id).map((manual) => [manual.title, manualPath(manual)]),
      );
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
      await expect(page).toHaveTitle(`${name} · Raúl E. Paz Zanini`);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        "content",
        `${name}: ${count} Manuales gratuitos de Raúl E. Paz Zanini.`,
      );
    });
});

test("Tab reaches the Autor's name, the menu, then every Manual in order, each brought into view", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  await page.keyboard.press("Tab");
  await expect(logo(page)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Índice" })).toBeFocused();
  for (const manual of HOME_MANUALES) {
    await page.keyboard.press("Tab");
    const link = trackLinks(page).and(page.locator(":focus"));
    await expect(link).toHaveAccessibleName(manual.title);
    await expect(link).toBeInViewport({ ratio: 0.9 });
  }
});

test("scrolling settles softly on a step, in the middle of the screen", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // A quarter of the way to the next step: close enough that the track pulls it back (a step is a whole screen).
  await page.mouse.move(100, 100);
  const [first, second] = await track(page)
    .getByRole("listitem")
    .evaluateAll((steps) =>
      steps.map((step) => step.getBoundingClientRect().top),
    );
  const height = (second ?? 0) - (first ?? 0);
  await page.mouse.wheel(0, height * 2 + height / 4);

  await expect(async () => {
    expect(await offCentre(step(page, 2))).toBeLessThan(2);
  }).toPass({ timeout: 3_000 });
});

test("the first and last books centre on the screen", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const last = step(page, HOME_MANUALES.length - 1);

  expect(await offCentre(step(page, 0))).toBeLessThan(2);
  await scrollToStep(last);
  expect(await offCentre(last)).toBeLessThan(2);
});

test("nothing scrolls sideways at this width or at 320, and every Manual is a full-size tap target", async ({
  page,
}) => {
  await page.goto("/");
  expect(await sideways(page)).toBeLessThanOrEqual(0);

  await page.setViewportSize({ width: 320, height: 700 });
  expect(await sideways(page)).toBeLessThanOrEqual(0);
  const sizes = await trackLinks(page).evaluateAll((links) =>
    links.map((link) => {
      const box = link.getBoundingClientRect();
      return Math.min(box.width, box.height);
    }),
  );
  expect(Math.min(...sizes)).toBeGreaterThanOrEqual(44);
});

test("a visitor scrolls to the last book in the 3D Hélice, taps it and lands on its Manual page", async ({
  page,
}) => {
  await page.goto("/");
  await shown3d(page);

  await tapBook(trackLinks(page).last());

  const last = HOME_MANUALES.at(-1);
  await expect(page).toHaveURL(`/manuales/${last?.slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    last?.title ?? "",
  );
  expect(await errorsOn(page)).toEqual([]);
});

test("a visitor taps a book in focus partway down the Hélice and lands on its Manual page", async ({
  page,
}) => {
  await page.goto("/");
  await shown3d(page);

  await tapBook(inferencial(page));

  await expect(page).toHaveURL("/manuales/estadistica-inferencial-desde-cero");
});

test("a modifier click on a 3D book opens its Manual in a new tab, as on a link", async ({
  page,
  context,
  isMobile,
}) => {
  test.skip(isMobile, "modifier keys: desktop");
  await page.goto("/");
  await shown3d(page);

  const opened = context.waitForEvent("page");
  await tapBook(inferencial(page), { modifiers: ["ControlOrMeta"] });

  const tab = await opened;
  await expect(tab).toHaveURL(
    /\/manuales\/estadistica-inferencial-desde-cero$/,
  );
  await expect(page).toHaveURL("/");
});

test("when the WebGL context is lost the flat track shows again, and its Tapas open their Manual pages", async ({
  page,
}) => {
  await page.goto("/");
  await shown3d(page);

  await loseWebGL(page);

  await expect(page.locator("canvas")).toHaveCount(0);
  const first = trackLinks(page).first();
  await expect(first.locator("span")).toHaveCSS("opacity", "1");
  await first.click();
  await expect(page).toHaveURL("/manuales/estadistica-descriptiva-desde-cero");
});

test.describe("under reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the flat track stays, and its Tapas open their Manual pages", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("canvas")).toHaveCount(0);
    await inferencial(page).click();
    await expect(page).toHaveURL(
      "/manuales/estadistica-inferencial-desde-cero",
    );
  });
});

test.describe("the words of the book in focus", () => {
  for (const motion of ["no-preference", "reduce"] as const) {
    test(`name the Manual on the step in view (motion: ${motion})`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: motion });
      await page.goto("/");
      // With motion the 3D Hélice is on screen; under reduced motion only the flat track is.
      if (motion === "no-preference") await shown3d(page);
      else await page.waitForLoadState("networkidle");

      for (const index of [0, 2, HOME_MANUALES.length - 1]) {
        await scrollToStep(step(page, index));
        await expect(words(page).getByRole("link")).toHaveAccessibleName(
          HOME_MANUALES[index]?.title ?? "",
        );
      }
    });
  }

  test("keep the Colección named at every scroll position, on every Colección's page", async ({
    page,
  }) => {
    for (const { name, numeral, path, count } of coleccionesWithCount()) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const head = words(page).getByText(`${numeral} · ${name}`, {
        exact: true,
      });
      const height = await step(page, 0).evaluate(
        (li) => li.getBoundingClientRect().height,
      );
      // Every quarter step from the first book to the last, as a scroll passes them.
      for (let quarter = 0; quarter <= (count - 1) * 4; quarter++) {
        await page.evaluate(
          (y) => {
            scrollTo({ top: y, behavior: "instant" });
          },
          (quarter * height) / 4,
        );
        await expect(head, `${path} at ${quarter / 4} steps`).toBeInViewport();
        expect(await shownOpacity(head)).toBeGreaterThan(0.99);
      }
    }
  });

  test("name the book on the step as soon as the scroll stops there, with no timer to wait out", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await scrollToStep(step(page, 3));
    await twoFrames(page);
    const title = words(page).getByRole("link");
    expect(await title.textContent()).toBe(HOME_MANUALES[3]?.title);
    expect(await shownOpacity(title)).toBeGreaterThan(0.99);
    expect(await visibleNumber(page)).toBe("04");
  });

  test("hold the title back between two books, out of the tab order", async ({
    page,
  }) => {
    await scrollOffStep(page, 2, 1 / 2);
    const title = words(page).getByRole("link");
    expect(await shownOpacity(title)).toBeLessThan(0.01);
    expect(
      await title.evaluate((link) => link.closest("[inert]") !== null),
    ).toBe(true);
  });

  test("under reduced motion, change without animation and keep the nearest book named between two", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await scrollOffStep(page, 2, 1 / 3);
    const title = words(page).getByRole("link");
    expect(await title.textContent()).toBe(HOME_MANUALES[2]?.title);
    expect(await shownOpacity(title)).toBe(1);
    expect(await visibleNumber(page)).toBe("03");
    expect(
      await words(page).evaluate(
        (region) => region.getAnimations({ subtree: true }).length,
      ),
    ).toBe(0);
  });

  test("never cover the book in focus", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    for (const [index, manual] of HOME_MANUALES.entries()) {
      await scrollToStep(step(page, index));
      await expect(words(page).getByRole("link")).toHaveAccessibleName(
        manual.title,
      );
      // The flat Tapa is where the 3D book in focus is drawn (the tap tests hold the two together).
      const book = await trackLinks(page)
        .nth(index)
        .locator("span")
        .evaluate((tapa) => tapa.getBoundingClientRect().toJSON() as Box);
      for (const line of await wordLines(page))
        expect(apart(book, line), manual.title).toBe(true);
    }
  });

  test("give the number, Colección and details of a Recorrido step and of an Estadística aplicada Manual", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await scrollToStep(step(page, 1));
    await expect.poll(() => visibleNumber(page)).toBe("02");
    await expect(words(page)).toContainText("I · Estadística desde cero");
    await expect(words(page)).toContainText("Paso 2 · R y Python · 49 páginas");

    await page.goto("/colecciones/estadistica-aplicada");
    await page.waitForLoadState("networkidle");
    await scrollToStep(
      step(page, manualesIn("estadistica-aplicada").length - 1),
    );
    await expect.poll(() => visibleNumber(page)).toBe("07");
    await expect(words(page)).toContainText("III · Estadística aplicada");
    await expect(words(page)).toContainText(
      /^.*Trabajo Social · .+ · \d+ páginas$/m,
    );
  });

  test("open their Manual from the title", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await scrollToStep(step(page, 1));
    const title = words(page).getByRole("link");
    await expect(title).toHaveAccessibleName(HOME_MANUALES[1]?.title ?? "");
    await title.click();
    await expect(page).toHaveURL(`/manuales/${HOME_MANUALES[1]?.slug}`);
  });
});

test("the Autor's name links home from a Manual page, by keyboard too", async ({
  page,
}) => {
  await page.goto("/manuales/estadistica-inferencial-desde-cero");
  await page.waitForLoadState("networkidle");

  await page.keyboard.press("Tab");
  await expect(logo(page)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/");
});

test("the license is stated once on the home page, inside the menu, and not after the last Manual", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const text = (await page.locator("body").textContent()) ?? "";
  expect(text.split(LICENSE).length - 1).toBe(1);
  expect(await licenseCount(page)).toBe(0);
  await page.getByRole("button", { name: "Índice" }).click();
  await expect(
    page.getByRole("dialog", { name: "Índice" }).getByText(LICENSE),
  ).toBeVisible();
});

test("the license is stated once on a Manual page", async ({ page }) => {
  await page.goto("/manuales/estadistica-inferencial-desde-cero");
  expect(await licenseCount(page)).toBe(1);
});

test("nothing shifts as the home page hydrates and the 3D arrives", async ({
  page,
}) => {
  await page.goto("/");
  await shown3d(page);

  const shift = await layoutShift(page);
  expect(shift).toBeLessThan(0.1);
});
