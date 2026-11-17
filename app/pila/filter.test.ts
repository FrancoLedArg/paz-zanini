import { describe, expect, it } from "vitest";

import { MANUALES } from "../catalog/catalog";
import { filterPila } from "./filter";

const slugsFor = (query: string) =>
  filterPila(MANUALES, new URLSearchParams(query)).map(({ slug }) => slug);

describe("filtering la Pila", () => {
  it("shows every Manual, in catalog order, when nothing is asked", () => {
    expect(slugsFor("")).toEqual(MANUALES.map(({ slug }) => slug));
  });

  it("finds a Manual by part of its title", () => {
    expect(slugsFor("q=inferencial")).toEqual([
      "estadistica-inferencial-desde-cero",
    ]);
  });

  it("ignores case and accents, and needs every word of the search", () => {
    expect(slugsFor("q=ESTADISTICA+no+parametrica")).toEqual([
      "estadistica-no-parametrica-desde-cero",
    ]);
  });

  it("shows nothing when no title matches", () => {
    expect(slugsFor("q=astrologia")).toEqual([]);
  });

  it("filtering by Colección shows only that Colección's Manuales", () => {
    expect(slugsFor("coleccion=estadistica-desde-cero")).toEqual([
      "estadistica-descriptiva-desde-cero",
      "probabilidad-y-distribuciones-desde-cero",
      "estadistica-inferencial-desde-cero",
      "estadistica-no-parametrica-desde-cero",
      "estadistica-multivariada-desde-cero",
      "series-de-tiempo-aplicadas",
    ]);
  });

  it("filtering by Carrera shows only the Manual written for it", () => {
    expect(slugsFor("carrera=Trabajo+Social")).toEqual([
      "estadistica-aplicada-trabajo-social",
    ]);
  });

  it("filtering by Herramienta shows only Manuales that teach with it", () => {
    expect(slugsFor("herramienta=Excel")).toEqual([
      "metodos-numericos-desde-cero",
    ]);
  });

  it("combines the search and every filter", () => {
    expect(
      slugsFor(
        "q=datos&coleccion=ciencia-de-datos-desde-cero&herramienta=Python",
      ),
    ).toEqual([
      "guia-para-un-buen-analisis-de-datos",
      "datos-en-python-desde-cero",
      "analisis-exploratorio-de-datos-python",
      "ciencia-de-datos-desde-cero",
    ]);
  });

  it("treats an invalid filter as no filter", () => {
    expect(
      slugsFor("coleccion=recetas&carrera=Medicina&herramienta=Java"),
    ).toEqual(MANUALES.map(({ slug }) => slug));
  });
});
