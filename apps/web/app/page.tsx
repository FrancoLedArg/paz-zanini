import Link from "next/link";
import { documentos, series } from "@paz/content";
import { SalaInfo } from "./client";
import { Bar, Rotulo, carpetasDe, hrefSerie, rangeLabel, rotulosDe } from "./ui";

export default function Sala() {
  return (
    <>
      <Bar crumbs={[]} />
      <main className="scene s-room" aria-label="Sala del archivo">
        <div className="room">
          <div className="cab-wrap">
            <nav className="cabinet" aria-label="Archivador">
              <div className="cab-plate">Fondo Paz Zanini</div>
              {series.map((s) => {
                const rotulos = rotulosDe(s);
                return (
                  <Link key={s.id} className="dfront" href={hrefSerie(s)} aria-label={`Abrir cajón ${s.numeral}: ${s.nombre}, ${rotulos.length} carpetas`}>
                    <Rotulo numeral={s.numeral} nombre={s.nombre} rango={rangeLabel(rotulos)} />
                    <span className="handle" aria-hidden="true" />
                  </Link>
                );
              })}
              <div className="cab-base" />
            </nav>
          </div>
          <div className="plaque">
            <span className="eyebrow">Fondo documental · Archivo abierto</span>
            <h1>Raúl E. Paz Zanini</h1>
            <p className="lede">Manuales para aprender estadística y ciencia de datos desde cero, junto con la producción académica y el expediente de su autor.</p>
            <dl className="tally">
              <div><dt>Documentos</dt><dd>N = {documentos.length}</dd></div>
              <div><dt>Manuales</dt><dd>{documentos.filter((d) => d.tipo === "Manual").length}</dd></div>
              <div><dt>Cajones</dt><dd>{series.length}</dd></div>
            </dl>
            <p className="how">Bajá para recorrer los cajones y abrí uno para ver sus carpetas.</p>
          </div>
          <SalaInfo cajones={series.map((s) => ({ numeral: s.numeral, nombre: s.nombre, titulo: s.titulo, fichas: carpetasDe(s) }))} />
        </div>
      </main>
    </>
  );
}
