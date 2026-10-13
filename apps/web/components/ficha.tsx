// Used by server pages and by client components (Peek, SalaInfo), so it must not import @paz/content values:
// they would end up in the browser bundle.
import { Fragment } from "react";

export type FichaData = { rotulo: string; tipo: string; titulo: string; filas: [string, string][]; alcance: string };

/** Ficha catalográfica: a Documento's catalog card. */
export function Ficha({ f }: { f: FichaData }) {
  return (
    <article className="card">
      <div className="c-top"><span className="c-code">{f.rotulo}</span><span className="c-kind">{f.tipo}</span></div>
      <h3 className="c-title">{f.titulo}</h3>
      <dl className="c-rows">{f.filas.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}</dl>
      <p className="c-note"><b>Alcance</b>{f.alcance}</p>
      <span className="stamp" aria-hidden="true">Fondo Paz Zanini</span>
    </article>
  );
}
