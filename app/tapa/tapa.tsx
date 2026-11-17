import {
  CARRERAS,
  COLECCIONES,
  type Manual,
  MANUALES,
  recorrido,
} from "../catalog/catalog";
import { contrastRatio, oklch } from "./color";
import { DESIGNS, type TapaDesign } from "./designs";
import { Motif, MOTIF_HEIGHT } from "./motifs";

export { contrastRatio };

// A Tapa is a self-contained SVG (it is also rasterized for the 3D cover), so it names its fonts and resolves its colours
// itself instead of reading the page's CSS tokens. Keep these in step with `@theme` in app/app.css.
const SERIF = "'Fraunces Variable', Georgia, serif";
const SANS = "'Instrument Sans Variable', system-ui, sans-serif";

const WIDTH = 210;
const HEIGHT = 297;
const MARGIN = 16;
const AUTOR = "Raúl E. Paz Zanini";

export function tapaDesign(manual: Manual): TapaDesign {
  const design = DESIGNS[manual.slug];
  if (!design) throw new Error(`No Tapa design for ${manual.slug}`);
  return design;
}

export interface TapaColors {
  background: string;
  text: string;
  muted: string;
  motif: string;
  motifFill: string;
}

interface Shade {
  lightness: number;
  chroma: number;
  hue: number;
}

const COLECCION_INK = {
  "estadistica-desde-cero": { hue: 252, chroma: 0.11 },
  "ciencia-de-datos-desde-cero": { hue: 168, chroma: 0.085 },
} as const;

const CAMPO_INK = {
  Salud: { hue: 8, chroma: 0.12 },
  Tecnología: { hue: 66, chroma: 0.1 },
  "Ciencias Sociales": { hue: 40, chroma: 0.11 },
} as const;

/** Colour encodes the Colección; the Recorrido step, or the Carrera within its Campo, sets the shade. */
function shade(manual: Manual): Shade {
  if (manual.coleccion === "estadistica-aplicada") {
    const campo = CARRERAS[manual.carrera];
    const siblings = Object.keys(CARRERAS).filter(
      (carrera) => CARRERAS[carrera as keyof typeof CARRERAS] === campo,
    );
    return {
      ...CAMPO_INK[campo],
      lightness: 0.47 - 0.05 * siblings.indexOf(manual.carrera),
    };
  }
  const steps = recorrido(manual.coleccion);
  const step = steps.findIndex((paso) =>
    paso.some((other) => other.slug === manual.slug),
  );
  return {
    ...COLECCION_INK[manual.coleccion],
    lightness: 0.48 - (0.14 * step) / (steps.length - 1),
  };
}

export function tapaColors(manual: Manual): TapaColors {
  const { lightness, chroma, hue } = shade(manual);
  return {
    background: oklch(lightness, chroma, hue),
    text: oklch(0.965, 0.015, 85),
    muted: oklch(0.9, 0.03, 85),
    motif: oklch(lightness + 0.24, chroma * 0.7, hue),
    motifFill: oklch(lightness + 0.07, chroma, hue),
  };
}

/** Spine thickness in mm. Exaggerated from real paper so the thinnest Lomo still carries legible type on a phone. */
export function lomoThickness(manual: Manual): number {
  return 26 + 0.15 * manual.pages;
}

function coleccionName(manual: Manual): string {
  return (
    COLECCIONES.find((coleccion) => coleccion.id === manual.coleccion)?.name ??
    ""
  );
}

/** Top-right mark: the Recorrido step, or the Campo for Estadística aplicada. */
function mark(manual: Manual): string {
  if (manual.coleccion === "estadistica-aplicada") {
    return CARRERAS[manual.carrera];
  }
  const step = recorrido(manual.coleccion).findIndex((paso) =>
    paso.some((other) => other.slug === manual.slug),
  );
  return String(step + 1).padStart(2, "0");
}

interface Props {
  manual: Manual;
  className?: string;
}

export function Tapa({ manual, className }: Props) {
  const colors = tapaColors(manual);
  const { lines, motif } = tapaDesign(manual);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`Tapa de ${manual.title}`}
      className={className}
    >
      <rect width={WIDTH} height={HEIGHT} fill={colors.background} />
      <g
        fontFamily={SANS}
        fontSize={6.2}
        fontWeight={600}
        letterSpacing={0.9}
        fill={colors.muted}
      >
        <text x={MARGIN} y={24}>
          {coleccionName(manual).toUpperCase()}
        </text>
        <text x={WIDTH - MARGIN} y={24} textAnchor="end">
          {mark(manual).toUpperCase()}
        </text>
      </g>
      <path
        d={`M${MARGIN} 31H${WIDTH - MARGIN}`}
        stroke={colors.muted}
        strokeWidth={0.4}
      />
      <text
        fontFamily={SERIF}
        fontSize={22}
        fontWeight={600}
        fill={colors.text}
      >
        {lines.map((line, i) => (
          <tspan key={line} x={MARGIN} y={58 + i * 24.5}>
            {line}
          </tspan>
        ))}
      </text>
      <g transform={`translate(0 ${HEIGHT - 32 - MOTIF_HEIGHT - 6})`}>
        <Motif
          kind={motif}
          ink={{ stroke: colors.motif, fill: colors.motifFill }}
        />
      </g>
      <path
        d={`M${MARGIN} 272H${WIDTH - MARGIN}`}
        stroke={colors.muted}
        strokeWidth={0.4}
      />
      <g fontFamily={SANS} fontSize={6.6} fill={colors.muted}>
        <text x={MARGIN} y={284} fontWeight={500}>
          {AUTOR}
        </text>
        <text x={WIDTH - MARGIN} y={284} fontWeight={600} textAnchor="end">
          {manual.herramientas.join(" · ")}
        </text>
      </g>
    </svg>
  );
}

export function Lomo({ manual, className }: Props) {
  const colors = tapaColors(manual);
  const thickness = lomoThickness(manual);
  const titleSize = Math.min(10, thickness * 0.36);
  const baseline = thickness / 2 + titleSize * 0.34;
  const numbered = manual.coleccion !== "estadistica-aplicada";

  return (
    <svg
      viewBox={`0 0 ${HEIGHT} ${thickness}`}
      role="img"
      aria-label={`Lomo de ${manual.title}`}
      className={className}
    >
      <rect width={HEIGHT} height={thickness} fill={colors.background} />
      <path
        d={`M0 3H${HEIGHT}M0 ${thickness - 3}H${HEIGHT}`}
        stroke={colors.muted}
        strokeWidth={0.3}
      />
      {numbered && (
        <text
          x={10}
          y={baseline}
          fontFamily={SANS}
          fontSize={titleSize * 0.62}
          fontWeight={600}
          fill={colors.muted}
        >
          {mark(manual)}
        </text>
      )}
      <text
        x={numbered ? 26 : 10}
        y={baseline}
        fontFamily={SERIF}
        fontSize={titleSize}
        fontWeight={600}
        fill={colors.text}
      >
        {tapaDesign(manual).lomo}
      </text>
      <text
        x={HEIGHT - 10}
        y={baseline}
        textAnchor="end"
        fontFamily={SANS}
        fontSize={titleSize * 0.62}
        fontWeight={600}
        fill={colors.muted}
      >
        {manual.herramientas.join(" · ")}
      </text>
    </svg>
  );
}

/** Every Manual in catalog order, for pages that show the whole collection. */
export { MANUALES };
