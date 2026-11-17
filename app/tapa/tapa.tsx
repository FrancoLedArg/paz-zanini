import {
  CARRERAS,
  COLECCIONES,
  type Manual,
  recorrido,
  recorridoStep,
} from "../catalog/catalog";
import { oklch } from "./color";
import { DESIGNS, type TapaDesign } from "./designs";
import { Motif, MOTIF_HEIGHT, MOTIF_WIDTH } from "./motifs";

// A Tapa is a self-contained SVG (it is also rasterized for the 3D cover), so it names its fonts and resolves its colours
// itself instead of reading the page's CSS tokens (CODING_STANDARDS, Styling). Keep the fonts in step with `@theme`.
const SERIF = "'Fraunces Variable', Georgia, serif";
const SANS = "'Instrument Sans Variable', system-ui, sans-serif";
const AUTOR = "Raúl E. Paz Zanini";
const CREAM = oklch(0.965, 0.015, 85);
const CREAM_MUTED = oklch(0.9, 0.03, 85);

// Cover geometry, in mm of an A4 page.
const WIDTH = 210;
const HEIGHT = 297;
const MARGIN = 16;
const CONTENT_WIDTH = WIDTH - 2 * MARGIN;
const LABEL_BASELINE = 24;
const HEADER_RULE = 31;
const TITLE_BASELINE = 58;
const TITLE_SIZE = 22;
const TITLE_LEADING = 24.5;
const TITLE_DESCENT = 6;
const MOTIF_GAP = 12;
const FOOTER_RULE = 272;
const FOOTER_BASELINE = 284;
const LABEL_SIZE = 6.2;
const FOOTER_SIZE = 6.6;

// Lomo geometry: the spine runs the page height; type is sized to its thickness, at most 10 mm.
const LOMO_INSET = 10;
const LOMO_TITLE_MAX = 10;
const LOMO_TITLE_RATIO = 0.36;
const LOMO_SMALL_RATIO = 0.62;
const LOMO_NUMBER_WIDTH = 16;

const COLECCION_INK = {
  "estadistica-desde-cero": { hue: 252, chroma: 0.11 },
  "ciencia-de-datos-desde-cero": { hue: 168, chroma: 0.085 },
} as const;

const CAMPO_INK = {
  Salud: { hue: 8, chroma: 0.12 },
  Tecnología: { hue: 66, chroma: 0.1 },
  "Ciencias Sociales": { hue: 40, chroma: 0.11 },
} as const;

export function tapaDesign(manual: Manual): TapaDesign {
  const design = DESIGNS[manual.slug];
  if (!design) throw new Error(`No Tapa design for ${manual.slug}`);
  return design;
}

/** Colour encodes the Colección; the Recorrido step, or the Carrera within its Campo, sets the shade. */
function shade(manual: Manual) {
  if (manual.coleccion === "estadistica-aplicada") {
    const campo = CARRERAS[manual.carrera];
    const sibling = Object.entries(CARRERAS)
      .filter(([, other]) => other === campo)
      .findIndex(([carrera]) => carrera === manual.carrera);
    const { hue, chroma } = CAMPO_INK[campo];
    // Each Carrera steps darker and turns slightly, so neighbours in a Campo stay apart.
    return { lightness: 0.47 - 0.07 * sibling, chroma, hue: hue + 9 * sibling };
  }
  const { hue, chroma } = COLECCION_INK[manual.coleccion];
  const lastStep = recorrido(manual.coleccion).length;
  const progress = ((recorridoStep(manual) ?? 1) - 1) / (lastStep - 1);
  return { lightness: 0.48 - 0.14 * progress, chroma, hue };
}

export function tapaColors(manual: Manual) {
  const { lightness, chroma, hue } = shade(manual);
  return {
    background: oklch(lightness, chroma, hue),
    text: CREAM,
    muted: CREAM_MUTED,
    motif: oklch(lightness + 0.24, chroma * 0.7, hue),
    motifFill: oklch(lightness + 0.07, chroma, hue),
  };
}

/** Spine thickness in mm. Exaggerated from real paper so the thinnest Lomo still carries legible type on a phone. */
export function lomoThickness(manual: Manual): number {
  return 26 + 0.15 * manual.pages;
}

/** The two header marks: the Colección, and its Recorrido number or (Estadística aplicada) the Campo. */
function marks(manual: Manual) {
  const coleccion =
    COLECCIONES.find(({ id }) => id === manual.coleccion)?.name ?? "";
  const corner =
    manual.coleccion === "estadistica-aplicada"
      ? CARRERAS[manual.carrera]
      : stepLabel(recorridoStep(manual));
  return { coleccion, corner };
}

function herramientasLabel(manual: Manual): string {
  return manual.herramientas.join(" · ");
}

function stepLabel(step: number | undefined): string {
  return String(step ?? "").padStart(2, "0");
}

interface Props {
  manual: Manual;
  className?: string;
}

export function Tapa({ manual, className }: Props) {
  const colors = tapaColors(manual);
  const { lines, motif } = tapaDesign(manual);
  const { coleccion, corner } = marks(manual);
  const herramientas = herramientasLabel(manual);

  // The motif fills the space between the title, however many lines it has, and the footer, inside the margins.
  const titleBottom =
    TITLE_BASELINE + (lines.length - 1) * TITLE_LEADING + TITLE_DESCENT;
  const motifSpace = FOOTER_RULE - MOTIF_GAP - (titleBottom + MOTIF_GAP);
  const motifScale = Math.min(
    CONTENT_WIDTH / MOTIF_WIDTH,
    motifSpace / MOTIF_HEIGHT,
  );
  const motifX = (WIDTH - MOTIF_WIDTH * motifScale) / 2;
  const motifY = FOOTER_RULE - MOTIF_GAP - MOTIF_HEIGHT * motifScale;

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
        fontSize={LABEL_SIZE}
        fontWeight={600}
        letterSpacing={0.9}
        fill={colors.muted}
      >
        <text x={MARGIN} y={LABEL_BASELINE}>
          {coleccion.toUpperCase()}
        </text>
        <text x={WIDTH - MARGIN} y={LABEL_BASELINE} textAnchor="end">
          {corner.toUpperCase()}
        </text>
      </g>
      <path
        d={`M${MARGIN} ${HEADER_RULE}H${WIDTH - MARGIN}M${MARGIN} ${FOOTER_RULE}H${WIDTH - MARGIN}`}
        stroke={colors.muted}
        strokeWidth={0.4}
      />
      <text
        fontFamily={SERIF}
        fontSize={TITLE_SIZE}
        fontWeight={600}
        fill={colors.text}
      >
        {lines.map((line, i) => (
          <tspan key={line} x={MARGIN} y={TITLE_BASELINE + i * TITLE_LEADING}>
            {line}
          </tspan>
        ))}
      </text>
      <g transform={`translate(${motifX} ${motifY}) scale(${motifScale})`}>
        <Motif
          kind={motif}
          ink={{ stroke: colors.motif, fill: colors.motifFill }}
        />
      </g>
      <g fontFamily={SANS} fontSize={FOOTER_SIZE} fill={colors.muted}>
        <text x={MARGIN} y={FOOTER_BASELINE} fontWeight={500}>
          {AUTOR}
        </text>
        {manual.par ? (
          <ParMarker
            label={herramientas}
            x={WIDTH - MARGIN}
            y={FOOTER_BASELINE}
            ink={colors.muted}
          />
        ) : (
          <text
            x={WIDTH - MARGIN}
            y={FOOTER_BASELINE}
            fontWeight={600}
            textAnchor="end"
          >
            {herramientas}
          </text>
        )}
      </g>
    </svg>
  );
}

interface ParMarkerProps {
  label: string;
  x: number;
  y: number;
  ink: string;
}

/** A Par's language in a pill, so the R and Python twins read apart at a glance. */
function ParMarker({ label, x, y, ink }: ParMarkerProps) {
  const width = 11 + label.length * 3.9;
  return (
    <g>
      <rect
        x={x - width}
        y={y - 7}
        width={width}
        height={10}
        rx={5}
        fill="none"
        stroke={ink}
        strokeWidth={0.6}
      />
      <text
        x={x - width / 2}
        y={y}
        fontWeight={700}
        textAnchor="middle"
        letterSpacing={0.4}
      >
        {label}
      </text>
    </g>
  );
}

export function Lomo({ manual, className }: Props) {
  const colors = tapaColors(manual);
  const thickness = lomoThickness(manual);
  const titleSize = Math.min(LOMO_TITLE_MAX, thickness * LOMO_TITLE_RATIO);
  const smallSize = titleSize * LOMO_SMALL_RATIO;
  // Optical vertical centre for a mixed-case line.
  const baseline = thickness / 2 + titleSize * 0.34;
  const step = recorridoStep(manual);

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
      <g
        fontFamily={SANS}
        fontSize={smallSize}
        fontWeight={600}
        fill={colors.muted}
      >
        {step !== undefined && (
          <text x={LOMO_INSET} y={baseline}>
            {stepLabel(step)}
          </text>
        )}
        <text x={HEIGHT - LOMO_INSET} y={baseline} textAnchor="end">
          {herramientasLabel(manual)}
        </text>
      </g>
      <text
        x={step === undefined ? LOMO_INSET : LOMO_INSET + LOMO_NUMBER_WIDTH}
        y={baseline}
        fontFamily={SERIF}
        fontSize={titleSize}
        fontWeight={600}
        fill={colors.text}
      >
        {tapaDesign(manual).lomo}
      </text>
    </svg>
  );
}
