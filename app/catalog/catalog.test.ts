import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  CARRERAS,
  type ColeccionDesdeCero,
  findManual,
  MANUALES,
  recorrido,
} from "./catalog";

describe("catalog integrity", () => {
  it("lists exactly the Manuales whose PDFs are published", () => {
    const published = readdirSync(
      join(import.meta.dirname, "../../public/manuales"),
    )
      .filter((file) => file.endsWith(".pdf"))
      .map((file) => file.replace(/\.pdf$/, ""))
      .sort();

    expect(MANUALES.map((manual) => manual.slug).sort()).toEqual(published);
  });

  it("links each Manual of a Par to its twin, and the twin back", () => {
    const links = MANUALES.filter((manual) => manual.par).map((manual) => [
      manual.slug,
      manual.par && findManual(manual.par)?.par,
    ]);

    expect(links).toEqual([
      ["datos-en-rstudio-desde-cero", "datos-en-rstudio-desde-cero"],
      ["datos-en-python-desde-cero", "datos-en-python-desde-cero"],
      ["analisis-exploratorio-de-datos-r", "analisis-exploratorio-de-datos-r"],
      [
        "analisis-exploratorio-de-datos-python",
        "analisis-exploratorio-de-datos-python",
      ],
    ]);
  });

  it("makes every Par one R Manual and one Python Manual", () => {
    const herramientasPerPar = MANUALES.filter((manual) => manual.par).map(
      (manual) =>
        [
          ...manual.herramientas,
          ...(findManual(manual.par ?? "")?.herramientas ?? []),
        ].sort(),
    );

    expect(herramientasPerPar).toEqual(Array(4).fill(["Python", "R"]));
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
