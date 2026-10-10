import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LICENCIA, documentos, getDocumento } from "@paz/content";
import { motif } from "@paz/content/motif";
import { Ficha } from "../../ficha";
import { Bar, fichaDe, hrefDoc, hrefSerie } from "../../ui";

type Props = { params: Promise<{ signatura: string }> };

const find = async ({ params }: Props) => getDocumento((await params).signatura) ?? notFound();

export const dynamicParams = false;
export const generateStaticParams = () => documentos.map((d) => ({ signatura: d.signatura.toLowerCase() }));

export async function generateMetadata(props: Props): Promise<Metadata> {
  const d = await find(props);
  return { title: `${d.signatura}: ${d.titulo}`, description: d.alcance };
}

/** Escritorio: the Carpeta opened, its Ficha on the left and its portada on the right. */
export default async function Page(props: Props) {
  const d = await find(props);
  const sibs = documentos.filter((x) => x.serie.id === d.serie.id);
  const i = sibs.findIndex((x) => x.signatura === d.signatura);
  const [prev, next] = [sibs[i - 1], sibs[i + 1]];
  const manual = d.tipo === "Manual";
  return (
    <>
      <Bar crumbs={[[`${d.serie.numeral} · ${d.serie.nombre}`, hrefSerie(d.serie)], [`${d.signatura} · ${d.titulo}`, hrefDoc(d.signatura)]]} />
      <main className="scene s-desk" aria-label="Carpeta abierta">
        <div className="desk-in">
          <nav className="dnav" aria-label="Carpetas vecinas">
            {prev ? <Link href={hrefDoc(prev.signatura)} data-dir="prev" aria-label={`Carpeta anterior: ${prev.signatura}`}>← {prev.signatura}</Link> : <span className="off">← Inicio</span>}
            <span className="pos">Carpeta {i + 1} de {sibs.length} · {d.serie.numeral}</span>
            {next ? <Link href={hrefDoc(next.signatura)} data-dir="next" aria-label={`Carpeta siguiente: ${next.signatura}`}>{next.signatura} →</Link> : <span className="off">Fin →</span>}
          </nav>
          <div className="spread">
            <div className="pane l">
              <h1 className="sr-only">{d.signatura}: {d.titulo}</h1>
              <Ficha f={fichaDe(d)} />
              <div className="acts">
                {d.pdf ? (
                  <a className="btn" href={d.pdf} target="_blank" rel="noopener">{manual ? "Abrir el manual (PDF)" : "Abrir la publicación"} <span aria-hidden="true">↗</span></a>
                ) : (
                  <p className="note">Este documento no tiene copia digital en el archivo. La ficha indica dónde consultarlo.</p>
                )}
                <Link className="btn ghost" href={hrefSerie(d.serie)} data-esc>Volver al cajón <span aria-hidden="true">Esc</span></Link>
              </div>
            </div>
            <div className="pane r" data-tab={d.signatura}>
              <article className="sheet doc" aria-label="Portada">
                <svg className="clip" viewBox="0 0 22 60" aria-hidden="true"><path d="M6 44V10a5 5 0 0 1 10 0v38a8 8 0 0 1-16 0V16" /></svg>
                <div className="dt"><span>{d.serie.numeral.toUpperCase()} · {d.signatura}</span><span>{d.tipo}</span></div>
                <div className="dm"><p className="pre">{manual ? d.serie.antetitulo : d.tipo + (d.anio ? ` · ${d.anio}` : "")}</p><h2 className="h3">{d.titulo}</h2></div>
                <div className="fig" dangerouslySetInnerHTML={{ __html: motif(d) }} />
                <div className="df"><b>Raúl E. Paz Zanini</b><span>{manual ? `Santiago del Estero · ${LICENCIA}` : d.fuente}</span></div>
              </article>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
