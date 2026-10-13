import Link from "next/link";
import type { CSSProperties } from "react";
import type { Serie } from "@paz/content";
import { hrefSerie, rangeLabel, rotulosDe } from "@/lib/archivo";
import { Bar } from "./bar";
import type { FichaData } from "./ficha";
import { Peek } from "./peek";
import { Rotulo } from "./rotulo";

/** A Carpeta as it stands in the tray: its tab, its title, one line of detail, and where it opens. */
export type Carpeta = { rotulo: string; titulo: string; meta: string; href: string };

type Props = {
  serie: Serie;
  /** The Carpetas grouped by Guía; a group without `nombre` has no divider card. */
  guias: { nombre?: string; carpetas: Carpeta[] }[];
  /** The Fichas the side panel shows, one per Carpeta. */
  fichas: FichaData[];
  stats: string[];
};

/** Cajón: a Serie opened, its Carpetas standing in the tray grouped by Guía. */
export function Cajon({ serie, guias, fichas, stats }: Props) {
  const total = guias.reduce((sum, g) => sum + g.carpetas.length, 0);
  // Carpetas further back are drawn a little smaller, for depth.
  const depth = (i: number) => (0.93 + 0.07 * (i / Math.max(1, total - 1))).toFixed(3);
  let index = 0; // position in the tray, counted across Guías

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
              {guias.map((guia, gi) => (
                <div key={gi} className="contents">
                  {guia.nombre ? (
                    <div className="gcard" style={{ "--d": depth(index) } as CSSProperties}><span>{guia.nombre}</span></div>
                  ) : null}
                  {guia.carpetas.map((c) => {
                    const i = index++;
                    return (
                      <Link
                        key={c.rotulo}
                        className="carpeta"
                        href={c.href}
                        data-code={c.rotulo}
                        style={{ "--tab": i % 3, "--d": depth(i) } as CSSProperties}
                        aria-label={`${c.rotulo}: ${c.titulo}`}
                      >
                        <span className="carpeta-tab">{c.rotulo}</span>
                        <span className="carpeta-titulo">{c.titulo}</span>
                        <span className="carpeta-meta">{c.meta}</span>
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
