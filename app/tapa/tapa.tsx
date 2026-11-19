import {
  CARRERAS,
  coleccionName,
  type Manual,
  recorrido,
  recorridoStep,
} from "../catalog/catalog";
import { oklch } from "./color";
import { DESIGNS, type TapaDesign } from "./designs";
import PLATES from "./engravings.json";

export { oklch };

// A Tapa is a self-contained SVG (it is also rasterized for the 3D cover), so it names its fonts and resolves its colours
// itself instead of reading the page's CSS tokens (CODING_STANDARDS, Styling). Keep the fonts in step with `@theme`.
const SERIF = "'Newsreader Variable', Georgia, serif";
const SANS = "'Hanken Grotesk Variable', system-ui, sans-serif";
// Newsreader's display cut, set by hand: an SVG's font size is in its own units, so automatic optical sizing would pick
// the text cut, and font-variation-settings has no SVG attribute, so it goes in `style`.
const DISPLAY_CUT = { fontVariationSettings: '"opsz" 72' };
const AUTOR = "Raúl E. Paz Zanini";
const CREAM = oklch(0.965, 0.015, 85);
const CREAM_MUTED = oklch(0.9, 0.03, 85);

// Cover geometry, in mm of an A4 page: a cream field with the engraving over a colour band with the title.
const WIDTH = 210;
const HEIGHT = 297;
const MARGIN = 20;
const FIELD_HEIGHT = 176; // the cream field; the colour band runs from here to the foot
const LABEL_BASELINE = 21;
const SMALL_CAPS = {
  fontFamily: SANS,
  fontSize: 4.6,
  fontWeight: 600,
  letterSpacing: 1,
};
const PLATE = { x: 30, y: 36, width: 150, height: 114 };
const CAPTION_BASELINE = 164;
const CAPTION_SIZE = 5;
const TITLE_BASELINE = 204;
const KICKER_DROP = 11;
const KICKER_SIZE = 7.5;
const KICKER_GAP = 3;
const TITLE_SIZE = 18;
const TITLE_SIZE_LONG = 16.5;
const TITLE_LEADING = 1.13;
const FOOTER_RULE = 268;
const FOOTER_BASELINE = 281;
const AUTOR_SIZE = 7.2;

// Lomo geometry: the spine runs the page height; type is sized to its thickness, at most 10 mm.
const LOMO_INSET = 10;
const LOMO_TITLE_MAX = 10;
const LOMO_TITLE_RATIO = 0.36;
const LOMO_SMALL_RATIO = 0.48;
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
    paper: CREAM,
    // The engraving, the caption and the labels on the cream field: a touch deeper than the band.
    ink: oklch(lightness - 0.06, chroma, hue),
  };
}

/** The public-domain engraving on a Manual's Tapa; a Par shares one. */
function engraving(manual: Manual) {
  const plate = PLATES.find((candidate) =>
    candidate.manuales.includes(manual.slug),
  );
  if (!plate) throw new Error(`No engraving for ${manual.slug}`);
  return { href: `/engravings/${plate.id}.jpg`, caption: plate.caption };
}

/** How far down the Tapa its cream field runs, as a share of its height; the 3D cover carries it into the bleed. */
export const TAPA_FIELD_SHARE = FIELD_HEIGHT / HEIGHT;

/** Spine thickness in mm. Exaggerated from real paper so the thinnest Lomo still carries legible type on a phone. */
export function lomoThickness(manual: Manual): number {
  return 26 + 0.15 * manual.pages;
}

/** The two header marks: the Colección, and its Recorrido number or (Estadística aplicada) the Campo. */
function marks(manual: Manual) {
  const coleccion = coleccionName(manual.coleccion);
  const corner =
    manual.coleccion === "estadistica-aplicada"
      ? CARRERAS[manual.carrera]
      : `N.º ${stepLabel(recorridoStep(manual))}`;
  return { coleccion, corner };
}

function herramientasLabel(manual: Manual): string {
  return manual.herramientas.join(" · ") || "Sin software";
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
  const { kicker, main, tail } = tapaDesign(manual);
  const plate = engraving(manual);
  const { coleccion, corner } = marks(manual);
  const herramientas = herramientasLabel(manual).toUpperCase();
  const lineCount = main.length + (tail ? 1 : 0);
  // Four lines step down so the last one clears the footer rule.
  const size = lineCount > 3 ? TITLE_SIZE_LONG : TITLE_SIZE;
  const leading = size * TITLE_LEADING;
  // The first title line sits on the same baseline on every Tapa; a kicker pushes it down by its own line.
  const firstBaseline = TITLE_BASELINE + (kicker ? KICKER_DROP : 0);
  const maskId = `engraving-${manual.slug}`;
  const grainId = `grain-${manual.slug}`;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`Tapa de ${manual.title}`}
      className={className}
    >
      <defs>
        {/* The engraving's mask lets the ink through where its lines are (ink white, paper black). */}
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          x={0}
          y={0}
          width={WIDTH}
          height={FIELD_HEIGHT}
        >
          <image
            href={plate.href}
            {...PLATE}
            preserveAspectRatio="xMidYMid meet"
          />
        </mask>
        <filter id={grainId} x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="1.4"
            numOctaves={2}
            seed={4}
            stitchTiles="stitch"
          />
          {/* Grey noise at full alpha, so the grain is even across the field. */}
          <feColorMatrix
            type="matrix"
            values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1"
          />
        </filter>
      </defs>
      <rect width={WIDTH} height={FIELD_HEIGHT} fill={colors.paper} />
      <g {...SMALL_CAPS} fill={colors.ink}>
        <text x={MARGIN} y={LABEL_BASELINE}>
          {coleccion.toUpperCase()}
        </text>
        <text x={WIDTH - MARGIN} y={LABEL_BASELINE} textAnchor="end">
          {corner.toUpperCase()}
        </text>
      </g>
      <rect
        width={WIDTH}
        height={FIELD_HEIGHT}
        fill={colors.ink}
        mask={`url(#${maskId})`}
      />
      <text
        x={WIDTH / 2}
        y={CAPTION_BASELINE}
        textAnchor="middle"
        fontFamily={SERIF}
        fontSize={CAPTION_SIZE}
        letterSpacing={0.1}
        fill={colors.ink}
      >
        {plate.caption}
      </text>
      {/* A faint paper grain, so the flat cream reads as printed stock. */}
      <rect
        width={WIDTH}
        height={FIELD_HEIGHT}
        filter={`url(#${grainId})`}
        opacity={0.1}
        style={{ mixBlendMode: "soft-light" }}
      />
      <rect
        y={FIELD_HEIGHT}
        width={WIDTH}
        height={HEIGHT - FIELD_HEIGHT}
        fill={colors.background}
      />
      {kicker && (
        <text
          x={MARGIN}
          y={firstBaseline - size - KICKER_GAP}
          fontFamily={SERIF}
          fontSize={KICKER_SIZE}
          letterSpacing={0.1}
          fill={colors.muted}
        >
          {kicker}
        </text>
      )}
      {/* No italics: "desde cero" steps back by weight and colour alone. */}
      <text
        fontFamily={SERIF}
        fontSize={size}
        fontWeight={420}
        letterSpacing={-0.15}
        style={DISPLAY_CUT}
        fill={colors.text}
      >
        {main.map((line, i) => (
          <tspan key={line} x={MARGIN} y={firstBaseline + i * leading}>
            {line}
          </tspan>
        ))}
        {tail && (
          <tspan
            x={MARGIN}
            y={firstBaseline + main.length * leading}
            fontWeight={350}
            fill={colors.muted}
          >
            {tail}
          </tspan>
        )}
      </text>
      <path
        d={`M${MARGIN} ${FOOTER_RULE}H${WIDTH - MARGIN}`}
        stroke={colors.muted}
        strokeWidth={0.25}
      />
      <text
        x={MARGIN}
        y={FOOTER_BASELINE}
        fontFamily={SERIF}
        fontSize={AUTOR_SIZE}
        letterSpacing={0.1}
        fill={colors.text}
      >
        {AUTOR}
      </text>
      <g {...SMALL_CAPS} fill={colors.muted}>
        {manual.par ? (
          <ParMarker
            label={herramientas}
            x={WIDTH - MARGIN}
            y={FOOTER_BASELINE}
            ink={colors.muted}
          />
        ) : (
          <text x={WIDTH - MARGIN} y={FOOTER_BASELINE} textAnchor="end">
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
  const width = 9 + label.length * 4.1;
  return (
    <g>
      <rect
        x={x - width}
        y={y - 5.6}
        width={width}
        height={8}
        rx={4}
        fill="none"
        stroke={ink}
        strokeWidth={0.6}
      />
      {/* Letter spacing trails the last letter, so shift back half of it to centre the word. */}
      <text x={x - width / 2 + 0.5} y={y} textAnchor="middle">
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
        letterSpacing={smallSize * 0.18}
        fill={colors.muted}
      >
        {step !== undefined && (
          <text x={LOMO_INSET} y={baseline}>
            {stepLabel(step)}
          </text>
        )}
        <text x={HEIGHT - LOMO_INSET} y={baseline} textAnchor="end">
          {herramientasLabel(manual).toUpperCase()}
        </text>
      </g>
      <text
        x={step === undefined ? LOMO_INSET : LOMO_INSET + LOMO_NUMBER_WIDTH}
        y={baseline}
        fontFamily={SERIF}
        fontSize={titleSize}
        fontWeight={500}
        fill={colors.text}
      >
        {tapaDesign(manual).lomo}
      </text>
    </svg>
  );
}
