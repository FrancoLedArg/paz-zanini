import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { expediente as ex } from "@paz/content";
import { Bar, hrefDoc } from "../../ui";
import { CopyMail } from "../../client";

type Props = { params: Promise<{ seccion: string }> };

const find = async ({ params }: Props) => {
  const { seccion } = await params;
  return ex.secciones.find((x) => x.id === seccion) ?? notFound();
};

export const dynamicParams = false;
export const generateStaticParams = () => ex.secciones.map((x) => ({ seccion: x.id }));

export async function generateMetadata(props: Props): Promise<Metadata> {
  const x = await find(props);
  return { title: `${x.titulo} · Expediente`, description: x.alcance };
}

/** Escritorio of the Expediente: the legajo on the left, one sección's foja on the right. */
export default async function Page(props: Props) {
  const x = await find(props);
  const i = ex.secciones.indexOf(x);
  const [prev, next] = [ex.secciones[i - 1], ex.secciones[i + 1]];
  return (
    <>
      <Bar crumbs={[[`${ex.numeral} · ${ex.nombre}`, "/expediente"], [`${x.rotulo} · ${x.titulo}`, `/expediente/${x.id}`]]} />
      <main className="scene s-desk" aria-label="Carpeta abierta">
        <div className="desk-in">
          <nav className="dnav" aria-label="Carpetas vecinas">
            {prev ? <Link href={`/expediente/${prev.id}`} data-dir="prev" aria-label={`Carpeta anterior: ${prev.rotulo}`}>← {prev.rotulo}</Link> : <span className="off">← Inicio</span>}
            <span className="pos">Carpeta {i + 1} de {ex.secciones.length} · {ex.numeral}</span>
            {next ? <Link href={`/expediente/${next.id}`} data-dir="next" aria-label={`Carpeta siguiente: ${next.rotulo}`}>{next.rotulo} →</Link> : <span className="off">Fin →</span>}
          </nav>
          <div className="spread">
            <div className="pane l">
              <section className="legajo">
                <span className="eyebrow">Legajo</span>
                <p className="h2">{ex.legajo.nombre}</p>
                <ul>{ex.legajo.cargos.map((c) => <li key={c}>{c}</li>)}</ul>
                <div className="contact"><span>Contacto</span><a href={`mailto:${ex.legajo.email}`}><output id="mail">{ex.legajo.email}</output></a><CopyMail /></div>
                <nav className="secs" aria-label="Carpetas del expediente">
                  {ex.secciones.map((s) => (
                    <Link key={s.id} href={`/expediente/${s.id}`} aria-current={s.id === x.id ? "page" : undefined}><span>{s.rotulo}</span><span>{s.titulo}</span></Link>
                  ))}
                </nav>
                <div className="acts"><Link className="btn ghost" href="/expediente" data-esc>Volver al cajón <span aria-hidden="true">Esc</span></Link></div>
              </section>
            </div>
            <div className="pane r" data-tab={x.rotulo}>
              <article className="sheet foja">
                <span className="fk">{x.rotulo} · Foja</span>
                <h1 className="h3">{x.titulo}</h1>
                {x.grupos.map((g) => (
                  <section key={g.titulo}>
                    <h2 className="h4">{g.titulo}</h2>
                    <ul>
                      {g.antecedentes.map((a) => (
                        <li key={a.titulo}>
                          <span className="y">{a.fecha}</span>
                          <span className="w">{a.titulo}<i>{a.lugar}</i>{a.documento && <Link className="lk" href={hrefDoc(a.documento)}>Ver {a.documento} en el archivo</Link>}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </article>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
