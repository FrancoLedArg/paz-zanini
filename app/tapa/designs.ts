export interface TapaDesign {
  /** The generic head of the title, set small above it ("Estadística aplicada a la"). */
  kicker?: string;
  /** The distinctive part of the title, one entry per line, as the title writes it (the Tapa capitalises it under a kicker). */
  main: readonly string[];
  /** The series' "desde cero", set lighter after it. */
  tail?: string;
  /** The title as it fits on the Lomo. */
  lomo: string;
}

const APLICADA_A_LA = "Estadística aplicada a la";
const APLICADA_AL = "Estadística aplicada al";
const DESDE_CERO = "desde cero";

// Designed per Manual, the way a book designer breaks a title; tests check the parts still read as the title.
export const DESIGNS: Readonly<Record<string, TapaDesign>> = {
  "estadistica-descriptiva-desde-cero": {
    main: ["Estadística", "descriptiva"],
    tail: DESDE_CERO,
    lomo: "Estadística descriptiva",
  },
  "probabilidad-y-distribuciones-desde-cero": {
    main: ["Probabilidad y", "distribuciones", "de probabilidad"],
    tail: DESDE_CERO,
    lomo: "Probabilidad y distribuciones",
  },
  "estadistica-inferencial-desde-cero": {
    main: ["Estadística", "inferencial"],
    tail: DESDE_CERO,
    lomo: "Estadística inferencial",
  },
  "estadistica-no-parametrica-desde-cero": {
    main: ["Estadística", "no paramétrica"],
    tail: DESDE_CERO,
    lomo: "Estadística no paramétrica",
  },
  "estadistica-multivariada-desde-cero": {
    main: ["Estadística", "multivariada"],
    tail: DESDE_CERO,
    lomo: "Estadística multivariada",
  },
  "series-de-tiempo-aplicadas": {
    main: ["Series de tiempo", "aplicadas"],
    lomo: "Series de tiempo aplicadas",
  },
  "guia-para-un-buen-analisis-de-datos": {
    main: ["Guía para un", "buen análisis", "de datos"],
    lomo: "Guía para un buen análisis de datos",
  },
  "datos-en-rstudio-desde-cero": {
    main: ["Trabajar con", "datos en RStudio"],
    tail: DESDE_CERO,
    lomo: "Datos en RStudio",
  },
  "datos-en-python-desde-cero": {
    main: ["Trabajar con", "datos en Python"],
    tail: DESDE_CERO,
    lomo: "Datos en Python",
  },
  "analisis-exploratorio-de-datos-r": {
    main: ["Análisis", "exploratorio de", "datos en R"],
    lomo: "Análisis exploratorio de datos en R",
  },
  "analisis-exploratorio-de-datos-python": {
    main: ["Análisis", "exploratorio de", "datos en Python"],
    lomo: "Análisis exploratorio de datos en Python",
  },
  "ciencia-de-datos-desde-cero": {
    main: ["Ciencia de datos"],
    tail: DESDE_CERO,
    lomo: "Ciencia de datos",
  },
  "dashboards-y-visualizacion-desde-cero": {
    main: ["Dashboards y", "visualización", "de datos"],
    tail: DESDE_CERO,
    lomo: "Dashboards y visualización",
  },
  "aprendizaje-automatico-desde-cero": {
    main: ["Aprendizaje", "automático"],
    tail: DESDE_CERO,
    lomo: "Aprendizaje automático",
  },
  "metodos-numericos-desde-cero": {
    main: ["Métodos", "numéricos"],
    tail: DESDE_CERO,
    lomo: "Métodos numéricos",
  },
  "estadistica-aplicada-obstetricia": {
    kicker: APLICADA_A_LA,
    main: ["obstetricia"],
    lomo: "Aplicada a la obstetricia",
  },
  "estadistica-aplicada-kinesiologia": {
    kicker: APLICADA_A_LA,
    main: ["kinesiología", "y fisiatría"],
    lomo: "Aplicada a la kinesiología",
  },
  "estadistica-aplicada-fonoaudiologia": {
    kicker: APLICADA_A_LA,
    main: ["fonoaudiología"],
    lomo: "Aplicada a la fonoaudiología",
  },
  "estadistica-aplicada-informatica": {
    kicker: APLICADA_A_LA,
    main: ["ingeniería", "en informática"],
    lomo: "Aplicada a la informática",
  },
  "estadistica-aplicada-periodismo": {
    kicker: APLICADA_AL,
    main: ["periodismo"],
    lomo: "Aplicada al periodismo",
  },
  "estadistica-aplicada-sociologia": {
    kicker: APLICADA_A_LA,
    main: ["sociología"],
    lomo: "Aplicada a la sociología",
  },
  "estadistica-aplicada-trabajo-social": {
    kicker: APLICADA_AL,
    main: ["trabajo social"],
    lomo: "Aplicada al trabajo social",
  },
};
