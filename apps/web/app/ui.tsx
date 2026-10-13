import Link from "next/link";
import { LICENCIA, getDocumento, type Documento, type DocumentoEnSerie, type Serie } from "@paz/content";
import { Peek, ThemeToggle } from "./client";
import type { FichaData } from "./ficha";

export const hrefSerie = (s: Serie) => ("secciones" in s ? "/expediente" : `/serie/${s.id}`);
export const hrefDoc = (signatura: string) => `/doc/${signatura.toLowerCase()}`;

export function rangeLabel(rotulos: string[]) {
  return `${rotulos[0]} – ${rotulos.at(-1)!.split("-")[1]} · n = ${rotulos.length}`;
}

export function rotulosDe(s: Serie) {
  return "secciones" in s ? s.secciones.map((x) => x.rotulo) : s.guias.flatMap((g) => g.documentos.map((d) => d.signatura));
}

/** Header: brand and crumbs (last one is the current page). */
export function Bar({ crumbs }: { crumbs: [string, string][] }) {
  const parts: [string, string][] = [["Archivo", "/"], ...crumbs];
  return (
    <header className="bar">
      <Link className="mark" href="/">Archivo Paz Zanini</Link>
      <nav className="crumbs" aria-label="Ubicación en el archivo">
        {parts.map(([label, href], i) => (
          <span key={href} style={{ display: "contents" }}>
            {i > 0 && <span className="sep" aria-hidden="true">/</span>}
            <Link href={href} aria-current={i === parts.length - 1 ? "page" : undefined}>{label}</Link>
          </span>
        ))}
      </nav>
      <ThemeToggle />
    </header>
  );
}

/** The drawer label in its metal holder. */
export function Rotulo({ numeral, nombre, rango }: { numeral: string; nombre: string; rango: string }) {
  return (
    <span className="holder">
      <span className="lbl"><span className="rn">{numeral}</span><span className="nm">{nombre}</span><span className="rg">{rango}</span></span>
    </span>
  );
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
  return { rotulo: d.signatura, tipo: d.tipo, titulo: d.titulo, alcance: d.alcance, filas: filas.filter((f): f is [string, string] => !!f[1]) };
}

/** A Serie's Carpetas in drawer order: each one's Ficha and where it opens. */
export function carpetasDe(s: Serie): (FichaData & { href: string; motivo?: Documento["motivo"]; faltante?: string })[] {
  if ("secciones" in s) {
    return s.secciones.map((x) => ({ rotulo: x.rotulo, tipo: "Legajo", titulo: x.titulo, alcance: x.alcance, filas: [["Serie", `${s.numeral} · ${s.nombre}`], ["Tipo", "Legajo"]], href: `/expediente/${x.id}` }));
  }
  return rotulosDe(s).map((r) => {
    const d = getDocumento(r)!;
    return { ...fichaDe(d), href: hrefDoc(r), motivo: d.motivo, faltante: d.faltante };
  });
}

export type Carpeta = { rotulo: string; titulo: string; meta: string; href: string };

/** Cajón: a Serie opened, its Carpetas standing in the tray grouped by Guía. */
export function Cajon({ serie, guias, fichas, stats }: { serie: Serie; guias: { nombre?: string; carpetas: Carpeta[] }[]; fichas: FichaData[]; stats: string[] }) {
  const n = guias.reduce((a, g) => a + g.carpetas.length, 0);
  const depth = (i: number) => (0.93 + 0.07 * (i / Math.max(1, n - 1))).toFixed(3);
  let k = 0;
  return (
    <>
      <Bar crumbs={[[`${serie.numeral} · ${serie.nombre}`, hrefSerie(serie)]]} />
      <main className="scene s-drawer" aria-label="Cajón abierto">
        <div className="dwrap">
          <div>
            <header className="dhead">
              <span className="k">{serie.numeral} · {serie.antetitulo}</span>
              <h1 className="h2">{serie.titulo}</h1>
              <p>{serie.descripcion}</p>
              <div className="st">{stats.map((s) => <span key={s}>{s}</span>)}</div>
            </header>
            <div className="tray">
              {guias.map((g, gi) => (
                <div key={gi} style={{ display: "contents" }}>
                  {g.nombre && <div className="gcard" style={{ "--d": depth(k) } as React.CSSProperties}><span>{g.nombre}</span></div>}
                  {g.carpetas.map((c) => {
                    const i = k++;
                    return (
                      <Link key={c.rotulo} className="fld" href={c.href} data-code={c.rotulo} style={{ "--tab": i % 3, "--d": depth(i) } as React.CSSProperties} aria-label={`${c.rotulo}: ${c.titulo}`}>
                        <span className="ftab">{c.rotulo}</span><span className="ft">{c.titulo}</span><span className="fm">{c.meta}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
            <Link className="lip" href="/" data-esc aria-label="Cerrar el cajón y volver al archivador">
              <Rotulo numeral={serie.numeral} nombre={serie.nombre} rango={rangeLabel(rotulosDe(serie))} />
              <span className="cl">Cerrar cajón · Esc</span>
            </Link>
            <div className="dpad" />
          </div>
          <Peek fichas={fichas} />
        </div>
      </main>
    </>
  );
}
