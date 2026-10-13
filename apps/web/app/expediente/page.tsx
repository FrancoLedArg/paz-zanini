import type { Metadata } from "next";
import { expediente as ex } from "@paz/content";
import { Cajon, carpetasDe } from "../ui";

export const metadata: Metadata = { title: `${ex.numeral}: ${ex.nombre}`, description: ex.descripcion };

export default function Page() {
  return (
    <Cajon
      serie={ex}
      guias={[{ carpetas: ex.secciones.map((x) => ({ rotulo: x.rotulo, titulo: x.titulo, href: `/expediente/${x.id}`, meta: `Legajo · ${x.alcance.split(",")[0]}` })) }]}
      fichas={carpetasDe(ex)}
      stats={[`n = ${ex.secciones.length} carpetas`]}
    />
  );
}
