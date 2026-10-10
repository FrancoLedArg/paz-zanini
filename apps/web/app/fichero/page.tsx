import type { Metadata } from "next";
import Link from "next/link";
import { documentos, series } from "@paz/content";
import { Fichero } from "../client";
import { Bar, hrefDoc } from "../ui";

export const metadata: Metadata = {
  title: "Fichero",
  description: `Buscá por tema, título o signatura entre las ${documentos.length} fichas del Archivo Paz Zanini.`,
};

export default function Page() {
  return (
    <>
      <Bar crumbs={[["Fichero", "/fichero"]]} />
      <main className="scene s-room fichero">
        <div className="fbox-open">
          <div className="fi-head">
            <div><span className="eyebrow">Índice general</span><h1 className="h2">Fichero</h1></div>
            <Link className="x" href="/" data-esc>Cerrar</Link>
          </div>
          <Fichero
            series={series.filter((s) => "guias" in s).map((s) => [s.id, `${s.numeral.replace("Serie ", "")} · ${s.nombre}`])}
            fichas={documentos.map((d) => {
              const donde = [`${d.serie.numeral} · ${d.serie.nombre}`, d.guia].filter(Boolean).join(" · ");
              return {
                rotulo: d.signatura,
                tipo: d.tipo,
                titulo: d.titulo,
                serie: d.serie.id,
                donde,
                href: hrefDoc(d.signatura),
                texto: [d.signatura, d.titulo, d.alcance, d.guia, d.serie.nombre, d.fuente, d.tipo].join(" "),
              };
            })}
          />
        </div>
      </main>
    </>
  );
}
