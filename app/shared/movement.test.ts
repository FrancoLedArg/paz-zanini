import { afterEach, expect, it, vi } from "vitest";

import type { ColeccionId } from "../catalog/catalog";
import { attachScene, changeColeccion, stepMovement } from "./movement";

let detach: () => void = vi.fn();
afterEach(() => {
  detach();
});

it("a Colección picked while the last change's page is on its way takes the page over at once, before building", async () => {
  // Each Colección's build, finished by the test.
  const building = new Map<
    ColeccionId,
    { promise: Promise<void>; resolve: () => void }
  >();
  detach = attachScene({
    coleccion: () => "estadistica-desde-cero",
    prewarm: (id) => {
      let build = building.get(id);
      if (!build) {
        let resolve: () => void = vi.fn();
        const promise = new Promise<void>((done) => {
          resolve = done;
        });
        build = { promise, resolve };
        building.set(id, build);
      }
      return build.promise;
    },
    wake: vi.fn(),
  });

  // Change B builds, leaves, and asks for its page, which never arrives in this test.
  const goB = vi.fn(() => new Promise<void>(vi.fn()));
  void changeColeccion("ciencia-de-datos-desde-cero", goB);
  building.get("ciencia-de-datos-desde-cero")?.resolve();
  await vi.waitFor(() => {
    expect(document.documentElement.dataset.helice).toBe("leaving");
  });
  stepMovement(1);
  await vi.waitFor(() => {
    expect(goB).toHaveBeenCalled();
  });

  // C, picked with B's page still on its way: its page is asked for now, while its covers are still building.
  const goC = vi.fn(() => new Promise<void>(vi.fn()));
  void changeColeccion("estadistica-aplicada", goC);
  await vi.waitFor(() => {
    expect(goC).toHaveBeenCalled();
  });
  expect(document.documentElement.dataset.helice).toBe("building");
});
