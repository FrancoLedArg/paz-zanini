import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { z } from "zod";

const Documento = z.object({
  signatura: z.string().regex(/^[A-Z]+-\d{2}$/),
  titulo: z.string(),
  tipo: z.string().default("Manual"),
  anio: z.string().optional(),
  fuente: z.string().optional(),
  pdf: z.string().optional(),
  alcance: z.string(),
  motivo: z.enum(["hist", "normal", "ci", "ranks", "scatter", "ts", "grid", "steps", "box", "venn", "dash", "tree", "newton", "reg", "wave", "stack", "mask"]),
  faltante: z.string().optional(),
});

const Cabecera = {
  id: z.string(),
  numeral: z.string(),
  nombre: z.string(),
  antetitulo: z.string(),
  titulo: z.string(),
  descripcion: z.string(),
};

const SerieDocumental = z.object({
  ...Cabecera,
  guias: z.array(z.object({ nombre: z.string().optional(), documentos: z.array(Documento) })),
});

const Expediente = z.object({
  ...Cabecera,
  legajo: z.object({ nombre: z.string(), cargos: z.array(z.string()), email: z.string() }),
  secciones: z.array(
    z.object({
      id: z.string(),
      rotulo: z.string(),
      titulo: z.string(),
      alcance: z.string(),
      grupos: z.array(
        z.object({
          titulo: z.string(),
          antecedentes: z.array(z.object({ fecha: z.string(), titulo: z.string(), lugar: z.string(), documento: z.string().optional() })),
        }),
      ),
    }),
  ),
});

export type Documento = z.infer<typeof Documento>;
export type SerieDocumental = z.infer<typeof SerieDocumental>;
export type Expediente = z.infer<typeof Expediente>;
export type Serie = SerieDocumental | Expediente;

const ORDEN = ["estadistica", "datos", "aplicaciones", "publicaciones", "expediente"];

// Not import.meta.dirname: Turbopack leaves it undefined, but keeps import.meta.url pointing at this file.
export function getSeries(dir = join(dirname(fileURLToPath(import.meta.url)), "../data")): Serie[] {
  const series = ORDEN.map((id) => {
    const file = join(dir, `${id}.yaml`);
    const schema = id === "expediente" ? Expediente : SerieDocumental;
    const parsed = schema.safeParse(parse(readFileSync(file, "utf8")));
    if (!parsed.success) throw new Error(`${id}.yaml: ${z.prettifyError(parsed.error)}`);
    return parsed.data;
  });
  const vistas = new Set<string>();
  for (const d of documentosDe(series)) {
    if (vistas.has(d.signatura)) throw new Error(`Signatura repetida: ${d.signatura}`);
    vistas.add(d.signatura);
  }
  const ex = series.find((s): s is Expediente => "secciones" in s)!;
  for (const a of ex.secciones.flatMap((x) => x.grupos.flatMap((g) => g.antecedentes))) {
    if (a.documento && !vistas.has(a.documento)) throw new Error(`expediente.yaml: "${a.titulo}" remite a ${a.documento}, que no existe`);
  }
  return series;
}

function documentosDe(series: Serie[]) {
  return series.flatMap((s) => ("guias" in s ? s.guias.flatMap((g) => g.documentos.map((d) => ({ ...d, serie: s, guia: g.nombre }))) : []));
}

export type DocumentoEnSerie = ReturnType<typeof documentosDe>[number];

export const series = getSeries();
export const expediente = series.find((s): s is Expediente => "secciones" in s)!;
export const documentos = documentosDe(series);
export const getDocumento = (signatura: string) => documentos.find((d) => d.signatura.toLowerCase() === signatura.toLowerCase());
export const LICENCIA = "CC BY-NC-SA 4.0";
