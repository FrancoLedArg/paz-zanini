import type { Metadata } from "next";
import { expediente as ex } from "@paz/content";
import { Cajon } from "@/components/cajon";
import { carpetasDe, hrefSeccion } from "@/lib/archivo";

export const metadata: Metadata = { title: `${ex.numeral}: ${ex.nombre}`, description: ex.descripcion };

export default function Page() {
  return (
    <Cajon
      serie={ex}
      guias={[{ carpetas: ex.secciones.map((x) => ({ rotulo: x.rotulo, titulo: x.titulo, href: hrefSeccion(x.id), meta: `Legajo · ${x.alcance.split(",")[0]}` })) }]}
      fichas={carpetasDe(ex)}
      stats={[`n = ${ex.secciones.length} carpetas`]}
    />
  );
}
