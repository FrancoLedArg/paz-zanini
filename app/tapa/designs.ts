import type { MotifKind } from "./motifs";

export interface TapaDesign {
  /** The title as set on the cover, one entry per line. */
  lines: readonly string[];
  /** The title as it fits on the Lomo. */
  lomo: string;
  motif: MotifKind;
}

// Designed per Manual, the way a book designer breaks a title; tests check the lines still read as the title.
export const DESIGNS: Readonly<Record<string, TapaDesign>> = {
  "estadistica-descriptiva-desde-cero": {
    lines: ["Estadística", "descriptiva", "desde cero"],
    lomo: "Estadística descriptiva",
    motif: "histogram",
  },
  "probabilidad-y-distribuciones-desde-cero": {
    lines: [
      "Probabilidad y",
      "distribuciones",
      "de probabilidad",
      "desde cero",
    ],
    lomo: "Probabilidad y distribuciones",
    motif: "curves",
  },
  "estadistica-inferencial-desde-cero": {
    lines: ["Estadística", "inferencial", "desde cero"],
    lomo: "Estadística inferencial",
    motif: "intervals",
  },
  "estadistica-no-parametrica-desde-cero": {
    lines: ["Estadística", "no paramétrica", "desde cero"],
    lomo: "Estadística no paramétrica",
    motif: "ranks",
  },
  "estadistica-multivariada-desde-cero": {
    lines: ["Estadística", "multivariada", "desde cero"],
    lomo: "Estadística multivariada",
    motif: "components",
  },
  "series-de-tiempo-aplicadas": {
    lines: ["Series de tiempo", "aplicadas"],
    lomo: "Series de tiempo aplicadas",
    motif: "series",
  },
  "guia-para-un-buen-analisis-de-datos": {
    lines: ["Guía para un", "buen análisis", "de datos"],
    lomo: "Guía para un buen análisis de datos",
    motif: "phases",
  },
  "datos-en-rstudio-desde-cero": {
    lines: ["Trabajar con", "datos en RStudio", "desde cero"],
    lomo: "Datos en RStudio",
    motif: "table",
  },
  "datos-en-python-desde-cero": {
    lines: ["Trabajar con", "datos en Python", "desde cero"],
    lomo: "Datos en Python",
    motif: "table",
  },
  "analisis-exploratorio-de-datos-r": {
    lines: ["Análisis", "exploratorio de", "datos en R"],
    lomo: "Análisis exploratorio de datos en R",
    motif: "scatter",
  },
  "analisis-exploratorio-de-datos-python": {
    lines: ["Análisis", "exploratorio de", "datos en Python"],
    lomo: "Análisis exploratorio de datos en Python",
    motif: "scatter",
  },
  "ciencia-de-datos-desde-cero": {
    lines: ["Ciencia de datos", "desde cero"],
    lomo: "Ciencia de datos",
    motif: "path",
  },
  "dashboards-y-visualizacion-desde-cero": {
    lines: ["Dashboards y", "visualización de", "datos desde cero"],
    lomo: "Dashboards y visualización",
    motif: "tiles",
  },
  "aprendizaje-automatico-desde-cero": {
    lines: ["Aprendizaje", "automático", "desde cero"],
    lomo: "Aprendizaje automático",
    motif: "tree",
  },
  "metodos-numericos-desde-cero": {
    lines: ["Métodos", "numéricos", "desde cero"],
    lomo: "Métodos numéricos",
    motif: "tangents",
  },
  "estadistica-aplicada-obstetricia": {
    lines: ["Estadística", "aplicada a la", "obstetricia"],
    lomo: "Aplicada a la obstetricia",
    motif: "trace",
  },
  "estadistica-aplicada-kinesiologia": {
    lines: ["Estadística", "aplicada a la", "kinesiología", "y fisiatría"],
    lomo: "Aplicada a la kinesiología",
    motif: "goniometer",
  },
  "estadistica-aplicada-fonoaudiologia": {
    lines: ["Estadística", "aplicada a la", "fonoaudiología"],
    lomo: "Aplicada a la fonoaudiología",
    motif: "soundwave",
  },
  "estadistica-aplicada-informatica": {
    lines: ["Estadística", "aplicada a la", "ingeniería en", "informática"],
    lomo: "Aplicada a la informática",
    motif: "control",
  },
  "estadistica-aplicada-periodismo": {
    lines: ["Estadística", "aplicada al", "periodismo"],
    lomo: "Aplicada al periodismo",
    motif: "columns",
  },
  "estadistica-aplicada-sociologia": {
    lines: ["Estadística", "aplicada a la", "sociología"],
    lomo: "Aplicada a la sociología",
    motif: "pyramid",
  },
  "estadistica-aplicada-trabajo-social": {
    lines: ["Estadística", "aplicada al", "trabajo social"],
    lomo: "Aplicada al trabajo social",
    motif: "network",
  },
};
