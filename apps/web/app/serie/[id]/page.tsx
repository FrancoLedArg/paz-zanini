import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LICENCIA, documentos, series, type SerieDocumental } from "@paz/content";
import { Cajon } from "@/components/cajon";
import { fichaDe, hrefDoc } from "@/lib/archivo";

type Props = { params: Promise<{ id: string }> };

const documentales = series.filter((s): s is SerieDocumental => "guias" in s);
const find = async ({ params }: Props) => {
  const { id } = await params;
  return documentales.find((s) => s.id === id) ?? notFound();
};

export const dynamicParams = false;
export const generateStaticParams = () => documentales.map((s) => ({ id: s.id }));

export async function generateMetadata(props: Props): Promise<Metadata> {
  const s = await find(props);
  return { title: `${s.numeral}: ${s.nombre}`, description: s.descripcion };
}

export default async function Page(props: Props) {
  const s = await find(props);
  const docs = documentos.filter((d) => d.serie.id === s.id);
  return (
    <Cajon
      serie={s}
      guias={s.guias.map((g) => ({
        nombre: g.nombre,
        carpetas: g.documentos.map((d) => ({
          rotulo: d.signatura,
          titulo: d.titulo,
          href: hrefDoc(d.signatura),
          meta: d.tipo === "Manual" ? `PDF · Manual · ${LICENCIA}` : d.tipo + (d.anio ? ` · ${d.anio}` : ""),
        })),
      }))}
      fichas={docs.map(fichaDe)}
      stats={[
        `n = ${docs.length} carpetas`,
        `${docs.filter((d) => d.pdf).length} con documento digital`,
        ...(s.guias.length > 1 ? [`${s.guias.length} guías`] : []),
      ]}
    />
  );
}
