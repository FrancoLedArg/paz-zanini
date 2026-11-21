import { afterEach, expect, it, vi } from "vitest";

import type { ColeccionId } from "../catalog/catalog";
import { attachScene, changeColeccion, stepMovement } from "./movement";

let detach: () => void = vi.fn();
afterEach(() => {
  detach();
});

it("a Colección picked mid-exit lets that exit finish while it builds, then asks for its page without leaving again", async () => {
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
  const html = document.documentElement;

  // B builds and starts to leave.
  void changeColeccion("ciencia-de-datos-desde-cero", vi.fn());
  building.get("ciencia-de-datos-desde-cero")?.resolve();
  await vi.waitFor(() => {
    expect(html.dataset.helice).toBe("leaving");
  });
  stepMovement(0.1);

  // C, picked mid-exit, builds while B's exit runs out: the books are gone, dissolved, by the time C is built.
  const goC = vi.fn();
  void changeColeccion("estadistica-aplicada", goC);
  await vi.waitFor(() => {
    expect(html.dataset.helice).toBe("building");
  });
  stepMovement(1);
  building.get("estadistica-aplicada")?.resolve();

  // C's page is asked for with no frame stepped: a second exit (sweeping the dissolved books up from below) would wait
  // for frames first.
  await vi.waitFor(() => {
    expect(goC).toHaveBeenCalled();
  });
});
