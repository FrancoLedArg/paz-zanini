import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  type ColeccionDesdeCero,
  findManual,
  MANUALES,
  recorrido,
} from "./catalog";

describe("catalog integrity", () => {
  it("lists exactly the Manuales whose PDFs are published", () => {
    const published = readdirSync("public/manuales")
      .filter((file) => file.endsWith(".pdf"))
      .map((file) => file.replace(/\.pdf$/, ""))
      .sort();

    expect(MANUALES.map((manual) => manual.slug).sort()).toEqual(published);
  });

  it("pairs each Manual of a Par with its other-language twin, both ways", () => {
    const pares = MANUALES.flatMap((manual) => {
      const twin = manual.par && findManual(manual.par);
      return twin ? [[manual, twin] as const] : [];
    });

    expect(pares.map(([a, b]) => [a.slug, b.slug])).toEqual([
      ["datos-en-rstudio-desde-cero", "datos-en-python-desde-cero"],
      ["datos-en-python-desde-cero", "datos-en-rstudio-desde-cero"],
      [
        "analisis-exploratorio-de-datos-r",
        "analisis-exploratorio-de-datos-python",
      ],
      [
        "analisis-exploratorio-de-datos-python",
        "analisis-exploratorio-de-datos-r",
      ],
    ]);
    for (const [manual, twin] of pares) {
      expect(twin.par).toBe(manual.slug);
      expect([...manual.herramientas, ...twin.herramientas].sort()).toEqual([
        "Python",
        "R",
      ]);
    }
  });
});

describe("recorrido", () => {
  const slugsPorPaso = (coleccion: ColeccionDesdeCero) =>
    recorrido(coleccion).map((paso) => paso.map((manual) => manual.slug));

  it("orders Estadística desde cero from descriptive statistics to time series", () => {
    expect(slugsPorPaso("estadistica-desde-cero")).toEqual([
      ["estadistica-descriptiva-desde-cero"],
      ["probabilidad-y-distribuciones-desde-cero"],
      ["estadistica-inferencial-desde-cero"],
      ["estadistica-no-parametrica-desde-cero"],
      ["estadistica-multivariada-desde-cero"],
      ["series-de-tiempo-aplicadas"],
    ]);
  });

  it("puts each Par of Ciencia de datos desde cero on a shared step", () => {
    expect(slugsPorPaso("ciencia-de-datos-desde-cero")).toEqual([
      ["guia-para-un-buen-analisis-de-datos"],
      ["datos-en-rstudio-desde-cero", "datos-en-python-desde-cero"],
      [
        "analisis-exploratorio-de-datos-r",
        "analisis-exploratorio-de-datos-python",
      ],
      ["ciencia-de-datos-desde-cero"],
      ["dashboards-y-visualizacion-desde-cero"],
      ["aprendizaje-automatico-desde-cero"],
      ["metodos-numericos-desde-cero"],
    ]);
  });
});
