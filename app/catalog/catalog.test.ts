import { readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  CARRERAS,
  type ColeccionDesdeCero,
  findManual,
  MANUALES,
  recorrido,
  recorridoStep,
} from "./catalog";

describe("catalog integrity", () => {
  it("lists exactly the Manuales whose PDFs are published", () => {
    const published = readdirSync(
      join(import.meta.dirname, "../../public/manuales"),
    )
      .filter((file) => file.endsWith(".pdf"))
      .map((file) => basename(file, ".pdf"))
      .sort();

    expect(MANUALES.map((manual) => manual.slug).sort()).toEqual(published);
  });

  it("pairs each Manual of a Par with an other-language twin that links back", () => {
    const pares = MANUALES.filter((manual) => manual.par).map((manual) => {
      const twin = findManual(manual.par ?? "");
      return {
        slug: manual.slug,
        twinLinksBack: twin?.par === manual.slug,
        herramientas: [
          ...manual.herramientas,
          ...(twin?.herramientas ?? []),
        ].sort(),
      };
    });

    const rAndPython = { twinLinksBack: true, herramientas: ["Python", "R"] };
    expect(pares).toEqual([
      { slug: "datos-en-rstudio-desde-cero", ...rAndPython },
      { slug: "datos-en-python-desde-cero", ...rAndPython },
      { slug: "analisis-exploratorio-de-datos-r", ...rAndPython },
      { slug: "analisis-exploratorio-de-datos-python", ...rAndPython },
    ]);
  });
});

describe("recorrido", () => {
  const slugsByStep = (coleccion: ColeccionDesdeCero) =>
    recorrido(coleccion).map((step) => step.map((manual) => manual.slug));

  it("orders Estadística desde cero from descriptive statistics to time series", () => {
    expect(slugsByStep("estadistica-desde-cero")).toEqual([
      ["estadistica-descriptiva-desde-cero"],
      ["probabilidad-y-distribuciones-desde-cero"],
      ["estadistica-inferencial-desde-cero"],
      ["estadistica-no-parametrica-desde-cero"],
      ["estadistica-multivariada-desde-cero"],
      ["series-de-tiempo-aplicadas"],
    ]);
  });

  it("puts each Par of Ciencia de datos desde cero on a shared step", () => {
    expect(slugsByStep("ciencia-de-datos-desde-cero")).toEqual([
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

describe("recorridoStep", () => {
  it("numbers a Manual by its step, counting a Par once", () => {
    const step = (slug: string) => {
      const manual = findManual(slug);
      return manual && recorridoStep(manual);
    };

    expect(step("guia-para-un-buen-analisis-de-datos")).toBe(1);
    expect(step("datos-en-python-desde-cero")).toBe(2);
    expect(step("metodos-numericos-desde-cero")).toBe(7);
    expect(step("estadistica-aplicada-periodismo")).toBeUndefined();
  });
});

describe("Estadística aplicada", () => {
  it("lists one Manual per Carrera, grouped by Campo", () => {
    const carreras = MANUALES.flatMap((manual) =>
      manual.coleccion === "estadistica-aplicada" ? [manual.carrera] : [],
    );

    expect(carreras.map((carrera) => [CARRERAS[carrera], carrera])).toEqual([
      ["Salud", "Obstetricia"],
      ["Salud", "Kinesiología"],
      ["Salud", "Fonoaudiología"],
      ["Tecnología", "Informática"],
      ["Ciencias Sociales", "Periodismo"],
      ["Ciencias Sociales", "Sociología"],
      ["Ciencias Sociales", "Trabajo Social"],
    ]);
  });
});
