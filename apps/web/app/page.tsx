import Link from "next/link";
import { documentos } from "@paz/content";
import { Bar } from "@/components/bar";
import { Rotulo } from "@/components/rotulo";
import { SalaInfo } from "@/components/sala-info";
import { SalaSlot } from "@/components/sala-3d/sala-slot";
import { salaCajones } from "@/lib/archivo";

/**
 * Sala: the Archivador, one drawer per Serie. This is the 2D version, links that work without JavaScript;
 * when WebGL is available, the 3D Sala (components/sala-3d) draws over the SalaSlot and these drawers turn invisible.
 */
export default function Sala() {
  const cajones = salaCajones();
  return (
    <>
      <Bar crumbs={[]} />
      <main className="scene s-room" aria-label="Sala del archivo">
        <div className="room">
          <SalaSlot cajones={cajones}>
            <nav className="cabinet" aria-label="Archivador">
              <div className="cab-plate">Fondo Paz Zanini</div>
              {cajones.map((cajon) => (
                <Link
                  key={cajon.href}
                  className="drawer-front"
                  href={cajon.href}
                  aria-label={`Abrir cajón ${cajon.numeral}: ${cajon.nombre}, ${cajon.carpetas.length} carpetas`}
                >
                  <Rotulo numeral={cajon.numeral} nombre={cajon.nombre} rango={cajon.rango} />
                  <span className="handle" aria-hidden="true" />
                </Link>
              ))}
              <div className="cab-base" />
            </nav>
          </SalaSlot>
          <div className="plaque">
            <span className="eyebrow">Fondo documental · Archivo abierto</span>
            <h1>Raúl E. Paz Zanini</h1>
            <p className="lede">Manuales para aprender estadística y ciencia de datos desde cero, junto con la producción académica y el expediente de su autor.</p>
            <dl className="tally">
              <div><dt>Documentos</dt><dd>N = {documentos.length}</dd></div>
              <div><dt>Manuales</dt><dd>{documentos.filter((d) => d.tipo === "Manual").length}</dd></div>
              <div><dt>Cajones</dt><dd>{cajones.length}</dd></div>
            </dl>
            <p className="how">Bajá para recorrer los cajones y abrí uno para ver sus carpetas.</p>
          </div>
          <SalaInfo cajones={cajones} />
        </div>
      </main>
    </>
  );
}
