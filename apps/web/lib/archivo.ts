// The content shaped for the pages: links, Rótulos, Fichas. Plain functions, no React.
import { LICENCIA, getDocumento, series, type DocumentoEnSerie, type Serie } from "@paz/content";
import type { FichaData } from "@/components/ficha";
import type { CajonData, CarpetaData } from "@/components/sala-3d/types";

export const hrefSerie = (s: Serie) => ("secciones" in s ? "/expediente" : `/serie/${s.id}`);
export const hrefDoc = (signatura: string) => `/doc/${signatura.toLowerCase()}`;
export const hrefSeccion = (id: string) => `/expediente/${id}`;

/** The Rótulos of a Serie's Carpetas, in drawer order: Signaturas, or the Expediente's sección codes. */
export function rotulosDe(s: Serie) {
  return "secciones" in s ? s.secciones.map((x) => x.rotulo) : s.guias.flatMap((g) => g.documentos.map((d) => d.signatura));
}

/**
 * The range a drawer's label shows: "EST-01 – 12 · n = 12" when every Rótulo shares a prefix,
 * "PUB-01 – PRY-04 · n = 9" when they don't (the last one in full, or it would read as PUB-04).
 */
export function rangeLabel(rotulos: string[]) {
  const first = rotulos[0];
  const last = rotulos.at(-1)!;
  const [firstPrefix] = first.split("-");
  const [lastPrefix, lastNumber] = last.split("-");
  const end = firstPrefix === lastPrefix ? lastNumber : last;
  return `${first} – ${end} · n = ${rotulos.length}`;
}

export function fichaDe(d: DocumentoEnSerie): FichaData {
  const manual = d.tipo === "Manual";
  const filas: [string, string | undefined][] = [
    ["Serie", `${d.serie.numeral} · ${d.serie.nombre}`],
    ["Guía", d.guia],
    ["Tipo", d.tipo],
    ["Año", d.anio],
    ["Formato", manual ? "PDF" : undefined],
    ["Licencia", manual ? LICENCIA : undefined],
    ["Fuente", d.fuente],
  ];
  const conValor = filas.filter((f): f is [string, string] => !!f[1]);
  return { rotulo: d.signatura, tipo: d.tipo, titulo: d.titulo, alcance: d.alcance, filas: conValor };
}

/** A Serie's Carpetas in drawer order: each one's Ficha and where it opens. */
export function carpetasDe(s: Serie): CarpetaData[] {
  if ("secciones" in s) {
    return s.secciones.map((x) => ({
      rotulo: x.rotulo,
      tipo: "Legajo",
      titulo: x.titulo,
      alcance: x.alcance,
      filas: [["Serie", `${s.numeral} · ${s.nombre}`], ["Tipo", "Legajo"]],
      href: hrefSeccion(x.id),
    }));
  }
  return rotulosDe(s).map((signatura) => {
    const d = getDocumento(signatura)!;
    return { ...fichaDe(d), href: hrefDoc(signatura), motivo: d.motivo, faltante: d.faltante };
  });
}

/**
 * The Sala page's drawers, top to bottom. The 2D drawers, the 3D Archivador and SalaInfo all read this one list:
 * passed to several client components, the same objects go to the browser only once.
 */
export function salaCajones(): CajonData[] {
  return series.map((s) => ({
    numeral: s.numeral,
    nombre: s.nombre,
    titulo: s.titulo,
    href: hrefSerie(s),
    rango: rangeLabel(rotulosDe(s)),
    carpetas: carpetasDe(s),
  }));
}
