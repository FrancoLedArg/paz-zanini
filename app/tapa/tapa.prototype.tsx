// PROTOTYPE, throwaway (branch prototype/editorial-tapas): three editorial Tapa systems in Newsreader + Hanken Grotesk,
// on one Manual per colour family. Answers "how premium can the Tapa get?". Not wired into the site or the 3D book.
import type { ReactNode } from "react";

import {
  CARRERAS,
  coleccionName,
  coleccionNumber,
  findManual,
  type Manual,
} from "../catalog/catalog";
import { oklch } from "./color";
import { Motif, MOTIF_HEIGHT, MOTIF_WIDTH } from "./motifs";
import cienciaDeDatos from "./prototype-engravings/ciencia-de-datos.jpg?inline";
import fonoaudiologia from "./prototype-engravings/fonoaudiologia.jpg?inline";
import informatica from "./prototype-engravings/informatica.jpg?inline";
import probabilidad from "./prototype-engravings/probabilidad.jpg?inline";
import sociologia from "./prototype-engravings/sociologia.jpg?inline";
import { shade, tapaColors, tapaDesign } from "./tapa";

const SERIF = "'Newsreader Variable', Georgia, serif";
const SANS = "'Hanken Grotesk Variable', system-ui, sans-serif";
const AUTOR = "Raúl E. Paz Zanini";
const CREAM = oklch(0.965, 0.015, 85);
const W = 210;
const H = 297;
const M = 16;
const DISPLAY = { fontVariationSettings: '"opsz" 72' };

interface Editorial {
  /** The generic head of the title, set small above it. */
  kicker?: string;
  /** The distinctive part, broken by hand. */
  main: string[];
  /** The series' "desde cero", set in italic after it. */
  tail?: string;
  /** What the motif shows, as a figure caption. */
  fig: string;
}

const EDITORIAL: Record<string, Editorial> = {
  "probabilidad-y-distribuciones-desde-cero": {
    main: ["Probabilidad y", "distribuciones", "de probabilidad"],
    tail: "desde cero",
    fig: "Tres densidades con distinto centro y dispersión",
  },
  "ciencia-de-datos-desde-cero": {
    main: ["Ciencia de datos"],
    tail: "desde cero",
    fig: "Del problema a la decisión, paso a paso",
  },
  "estadistica-aplicada-fonoaudiologia": {
    kicker: "Estadística aplicada a la",
    main: ["Fonoaudiología"],
    fig: "Una fuente sonora y su onda que decae",
  },
  "estadistica-aplicada-informatica": {
    kicker: "Estadística aplicada a la",
    main: ["Ingeniería", "en informática"],
    fig: "Gráfico de control con un punto fuera de los límites",
  },
  "estadistica-aplicada-sociologia": {
    kicker: "Estadística aplicada a la",
    main: ["Sociología"],
    fig: "Pirámide de población por grupos de edad",
  },
};

export const PROTOTYPE_MANUALES = Object.keys(EDITORIAL).map((slug) => {
  const manual = findManual(slug);
  if (!manual) throw new Error(`No Manual ${slug}`);
  return manual;
});

function facts(manual: Manual) {
  const number = String(coleccionNumber(manual)).padStart(2, "0");
  const aplicada = manual.coleccion === "estadistica-aplicada";
  const editorial = EDITORIAL[manual.slug];
  if (!editorial) throw new Error(`No editorial design for ${manual.slug}`);
  return {
    ...editorial,
    colors: tapaColors(manual),
    coleccion: coleccionName(manual.coleccion),
    number,
    corner: aplicada ? CARRERAS[manual.carrera] : `N.º ${number}`,
    herramientas: manual.herramientas.join(" · ") || "Sin software",
    motif: tapaDesign(manual).motif,
  };
}

/** A faint paper grain over the whole cover, so flat colour reads as printed stock. */
function Grain({ id, opacity = 0.16 }: { id: string; opacity?: number }) {
  return (
    <>
      <filter id={id} x="0" y="0" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="1.4"
          numOctaves={2}
          seed={4}
          stitchTiles="stitch"
        />
        <feColorMatrix
          type="matrix"
          values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1"
        />
      </filter>
      <rect
        width={W}
        height={H}
        filter={`url(#${id})`}
        opacity={opacity}
        style={{ mixBlendMode: "soft-light" }}
      />
    </>
  );
}

function Frame({
  manual,
  className,
  children,
}: {
  manual: Manual;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Tapa de ${manual.title}`}
      className={className}
    >
      {children}
    </svg>
  );
}

function fitMotif(width: number, height: number) {
  return Math.min(width / MOTIF_WIDTH, height / MOTIF_HEIGHT);
}

interface Props {
  manual: Manual;
  className?: string | undefined;
}

/** A: Lámina. An academic plate: the motif framed as a figure with its caption, the title above it like a monograph. */
export function TapaLamina({ manual, className }: Props) {
  const f = facts(manual);
  const size = 24;
  const lead = 25.5;
  const kickerY = 50;
  const firstY = f.kicker ? 72 : 60;
  const lines = [...f.main, ...(f.tail ? [f.tail] : [])];
  const titleBottom = firstY + (lines.length - 1) * lead + 6;
  const plateTop = Math.max(titleBottom + 14, 138);
  const plateBottom = 252;
  const pad = 9;
  const scale = fitMotif(W - 2 * M - 2 * pad, plateBottom - plateTop - 2 * pad);
  const motifW = MOTIF_WIDTH * scale;
  const motifH = MOTIF_HEIGHT * scale;
  const plate = oklch(...shadeOf(manual, -0.035));
  return (
    <Frame manual={manual} className={className}>
      <rect width={W} height={H} fill={f.colors.background} />
      <g
        fontFamily={SANS}
        fontSize={5.4}
        fontWeight={600}
        letterSpacing={0.9}
        fill={f.colors.muted}
      >
        <text x={M} y={22}>
          {f.coleccion.toUpperCase()}
        </text>
        <text x={W - M} y={22} textAnchor="end">
          {f.corner.toUpperCase()}
        </text>
      </g>
      <path
        d={`M${M} 27H${W - M}`}
        stroke={f.colors.muted}
        strokeWidth={0.25}
      />
      {f.kicker && (
        <text
          x={M}
          y={kickerY}
          fontFamily={SERIF}
          fontStyle="italic"
          fontSize={10}
          fill={f.colors.muted}
        >
          {f.kicker}
        </text>
      )}
      <text
        fontFamily={SERIF}
        fontSize={size}
        fontWeight={400}
        letterSpacing={-0.3}
        fill={f.colors.text}
        style={DISPLAY}
      >
        {f.main.map((line, i) => (
          <tspan key={line} x={M} y={firstY + i * lead}>
            {line}
          </tspan>
        ))}
        {f.tail && (
          <tspan
            x={M}
            y={firstY + f.main.length * lead}
            fontStyle="italic"
            fill={f.colors.muted}
          >
            {f.tail}
          </tspan>
        )}
      </text>
      <rect
        x={M}
        y={plateTop}
        width={W - 2 * M}
        height={plateBottom - plateTop}
        fill={plate}
        stroke={f.colors.muted}
        strokeWidth={0.2}
        strokeOpacity={0.6}
      />
      <g
        transform={`translate(${(W - motifW) / 2} ${plateTop + (plateBottom - plateTop - motifH) / 2}) scale(${scale})`}
      >
        <Motif
          kind={f.motif}
          ink={{ stroke: f.colors.motif, fill: f.colors.motifFill }}
        />
      </g>
      <text
        x={M}
        y={plateBottom + 8}
        fontFamily={SERIF}
        fontSize={5.6}
        fill={f.colors.muted}
      >
        <tspan
          fontFamily={SANS}
          fontWeight={600}
          letterSpacing={0.6}
          fontSize={4.8}
        >
          FIG. {f.number}
        </tspan>
        <tspan fontStyle="italic" dx={3}>
          {f.fig}
        </tspan>
      </text>
      <text
        x={M}
        y={284}
        fontFamily={SERIF}
        fontSize={8.6}
        fill={f.colors.text}
      >
        {AUTOR}
      </text>
      <text
        x={W - M}
        y={284}
        textAnchor="end"
        fontFamily={SANS}
        fontSize={5.4}
        fontWeight={600}
        letterSpacing={0.9}
        fill={f.colors.muted}
      >
        {f.herramientas.toUpperCase()}
      </text>
      <Grain id={`grain-a-${manual.slug}`} />
    </Frame>
  );
}

/** B: Numeral. The series number as a huge display figure, the title anchored to the foot like a Swiss monograph. */
export function TapaNumeral({ manual, className }: Props) {
  const f = facts(manual);
  const size = 23;
  const lead = 24.5;
  const lines = [...f.main, ...(f.tail ? [f.tail] : [])];
  const lastY = 252;
  const firstY = lastY - (lines.length - 1) * lead;
  const kickerY = firstY - size - 2;
  // The motif is a vignette right of the numeral, sitting on its baseline.
  const numeralBaseline = 128;
  const scale = fitMotif(64, 46);
  const motifW = MOTIF_WIDTH * scale;
  const motifH = MOTIF_HEIGHT * scale;
  return (
    <Frame manual={manual} className={className}>
      <rect width={W} height={H} fill={f.colors.background} />
      <g
        fontFamily={SANS}
        fontSize={5.4}
        fontWeight={600}
        letterSpacing={0.9}
        fill={f.colors.muted}
      >
        <text x={M} y={22}>
          {f.coleccion.toUpperCase()}
        </text>
        <text x={W - M} y={22} textAnchor="end">
          {f.corner.toUpperCase()}
        </text>
      </g>
      <text
        x={M - 3}
        y={numeralBaseline}
        fontFamily={SERIF}
        fontSize={104}
        fontWeight={250}
        letterSpacing={-4}
        fill={f.colors.motif}
        style={DISPLAY}
      >
        {f.number}
      </text>
      <g
        transform={`translate(${W - M - motifW} ${numeralBaseline - motifH}) scale(${scale})`}
      >
        <Motif
          kind={f.motif}
          ink={{ stroke: f.colors.motif, fill: f.colors.motifFill }}
        />
      </g>
      {f.kicker && (
        <text
          x={M}
          y={kickerY}
          fontFamily={SANS}
          fontSize={5.4}
          fontWeight={600}
          letterSpacing={0.9}
          fill={f.colors.muted}
        >
          {f.kicker.toUpperCase()}
        </text>
      )}
      <text
        fontFamily={SERIF}
        fontSize={size}
        fontWeight={450}
        letterSpacing={-0.3}
        fill={f.colors.text}
        style={DISPLAY}
      >
        {f.main.map((line, i) => (
          <tspan key={line} x={M} y={firstY + i * lead}>
            {line}
          </tspan>
        ))}
        {f.tail && (
          <tspan
            x={M}
            y={lastY}
            fontStyle="italic"
            fontWeight={350}
            fill={f.colors.muted}
          >
            {f.tail}
          </tspan>
        )}
      </text>
      <path
        d={`M${M} 268H${W - M}`}
        stroke={f.colors.muted}
        strokeWidth={0.25}
      />
      <text
        x={M}
        y={281}
        fontFamily={SANS}
        fontSize={5.4}
        fontWeight={600}
        letterSpacing={0.9}
        fill={f.colors.muted}
      >
        {AUTOR.toUpperCase()}
      </text>
      <text
        x={W - M}
        y={281}
        textAnchor="end"
        fontFamily={SANS}
        fontSize={5.4}
        fontWeight={600}
        letterSpacing={0.9}
        fill={f.colors.muted}
      >
        {f.herramientas.toUpperCase()}
      </text>
      <Grain id={`grain-b-${manual.slug}`} />
    </Frame>
  );
}

/** C: Etiqueta. Two-tone: the motif printed large and bleeding off the coloured field, the title on a cream label below. */
export function TapaEtiqueta({ manual, className }: Props) {
  const f = facts(manual);
  const band = 176;
  const lines = [...f.main, ...(f.tail ? [f.tail] : [])];
  const size = lines.length > 2 ? 18 : 21;
  const lead = size * 1.08;
  const labelTop = band + (f.kicker ? 30 : 24);
  const blockH = (lines.length - 1) * lead;
  const firstY =
    labelTop + (f.kicker ? 6 : 0) + Math.max(0, (52 - blockH) / 2 - 6);
  const scale = (W + 30) / MOTIF_WIDTH;
  const motifH = MOTIF_HEIGHT * scale;
  const ink = oklch(...shadeOf(manual, -0.04));
  return (
    <Frame manual={manual} className={className}>
      <rect width={W} height={H} fill={CREAM} />
      <rect width={W} height={band} fill={f.colors.background} />
      <g
        fontFamily={SANS}
        fontSize={5.4}
        fontWeight={600}
        letterSpacing={0.9}
        fill={f.colors.muted}
      >
        <text x={M} y={22}>
          {f.coleccion.toUpperCase()}
        </text>
        <text x={W - M} y={22} textAnchor="end">
          {f.corner.toUpperCase()}
        </text>
      </g>
      <svg
        x={0}
        y={0}
        width={W}
        height={band}
        viewBox={`0 0 ${W} ${band}`}
        overflow="hidden"
      >
        <g
          transform={`translate(-15 ${band - motifH + 3.5 * scale}) scale(${scale})`}
        >
          <Motif
            kind={f.motif}
            ink={{ stroke: f.colors.motif, fill: f.colors.motifFill }}
          />
        </g>
      </svg>
      <Grain id={`grain-c-${manual.slug}`} opacity={0.2} />
      {f.kicker && (
        <text
          x={W / 2}
          y={band + 24}
          textAnchor="middle"
          fontFamily={SANS}
          fontSize={5.2}
          fontWeight={600}
          letterSpacing={1}
          fill={f.colors.background}
        >
          {f.kicker.toUpperCase()}
        </text>
      )}
      <text
        fontFamily={SERIF}
        fontSize={size}
        fontWeight={450}
        letterSpacing={-0.2}
        textAnchor="middle"
        fill={ink}
        style={DISPLAY}
      >
        {f.main.map((line, i) => (
          <tspan key={line} x={W / 2} y={firstY + i * lead}>
            {line}
          </tspan>
        ))}
        {f.tail && (
          <tspan
            x={W / 2}
            y={firstY + f.main.length * lead}
            fontStyle="italic"
            fontWeight={350}
          >
            {f.tail}
          </tspan>
        )}
      </text>
      <path
        d={`M${W / 2 - 10} 262H${W / 2 + 10}`}
        stroke={f.colors.background}
        strokeWidth={0.4}
      />
      <text
        x={W / 2}
        y={276}
        textAnchor="middle"
        fontFamily={SERIF}
        fontSize={7.6}
        fill={ink}
      >
        {AUTOR}
      </text>
      <text
        x={W / 2}
        y={285}
        textAnchor="middle"
        fontFamily={SANS}
        fontSize={4.6}
        fontWeight={600}
        letterSpacing={0.8}
        fill={f.colors.background}
      >
        {f.herramientas.toUpperCase()}
      </text>
    </Frame>
  );
}

/** The Tapa's background shade, moved in lightness, as oklch() arguments. */
function shadeOf(manual: Manual, delta: number): [number, number, number] {
  const { lightness, chroma, hue } = shade(manual);
  return [lightness + delta, chroma, hue];
}

// Public-domain engravings from Wikimedia Commons, cleaned to a luminance mask (ink white, paper black).
const ENGRAVINGS: Record<string, { src: string; caption: string }> = {
  "probabilidad-y-distribuciones-desde-cero": {
    src: probabilidad,
    caption: "Quincunx de Francis Galton, 1889",
  },
  "ciencia-de-datos-desde-cero": {
    src: cienciaDeDatos,
    caption: "Máquina Jacquard de doble cilindro, 1892",
  },
  "estadistica-aplicada-fonoaudiologia": {
    src: fonoaudiologia,
    caption: "Fonautógrafo de Édouard-Léon Scott, 1859",
  },
  "estadistica-aplicada-informatica": {
    src: informatica,
    caption: "Máquina diferencial de Charles Babbage, 1853",
  },
  "estadistica-aplicada-sociologia": {
    src: sociologia,
    caption: "Tabuladora de Hollerith, censo de 1890",
  },
};

interface EngravingProps {
  id: string;
  src: string;
  ink: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The engraving printed in one ink: its mask lets a flat fill through where the lines are. */
function Engraving({ id, src, ink, x, y, width, height }: EngravingProps) {
  return (
    <>
      <mask id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
        <image
          href={src}
          x={x}
          y={y}
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid meet"
        />
      </mask>
      <rect width={W} height={H} fill={ink} mask={`url(#${id})`} />
    </>
  );
}

function engraving(manual: Manual) {
  const found = ENGRAVINGS[manual.slug];
  if (!found) throw new Error(`No engraving for ${manual.slug}`);
  return found;
}

/** The title block: an italic kicker, the title, an italic "desde cero"; aligned by `anchor`. */
function TitleBlock({
  f,
  x,
  firstY,
  size,
  lead,
  anchor,
  ink,
  soft,
  kickerSize = 9,
}: {
  f: ReturnType<typeof facts>;
  x: number;
  firstY: number;
  size: number;
  lead: number;
  anchor: "start" | "middle";
  ink: string;
  soft: string;
  kickerSize?: number;
}) {
  // No italics: the kicker and "desde cero" step back by colour and size alone.
  return (
    <>
      {f.kicker && (
        <text
          x={x}
          y={firstY - size - 3}
          textAnchor={anchor}
          fontFamily={SERIF}
          fontSize={kickerSize}
          letterSpacing={0.1}
          fill={soft}
        >
          {f.kicker}
        </text>
      )}
      <text
        fontFamily={SERIF}
        fontSize={size}
        fontWeight={420}
        letterSpacing={-0.15}
        textAnchor={anchor}
        fill={ink}
        style={DISPLAY}
      >
        {f.main.map((line, i) => (
          <tspan key={line} x={x} y={firstY + i * lead}>
            {line}
          </tspan>
        ))}
        {f.tail && (
          <tspan
            x={x}
            y={firstY + f.main.length * lead}
            fontWeight={350}
            fill={soft}
          >
            {f.tail}
          </tspan>
        )}
      </text>
    </>
  );
}

/** D: Grabado. The engraving printed in the Tapa's ink on cream, the title on the coloured band below, left-aligned. */
export function TapaGrabado({ manual, className }: Props) {
  const f = facts(manual);
  const e = engraving(manual);
  const band = 176;
  const margin = 20;
  const ink = oklch(...shadeOf(manual, -0.06));
  const lines = f.main.length + (f.tail ? 1 : 0);
  // Four lines (Probabilidad) step down so the last one clears the footer rule.
  const size = lines > 3 ? 16.5 : 18;
  const lead = size * 1.13;
  // The first title line sits on the same baseline on every Tapa; a kicker pushes it down by its own line.
  const firstY = band + 28 + (f.kicker ? 11 : 0);
  return (
    <Frame manual={manual} className={className}>
      <rect width={W} height={H} fill={CREAM} />
      <g
        fontFamily={SANS}
        fontSize={4.6}
        fontWeight={600}
        letterSpacing={1}
        fill={ink}
      >
        <text x={margin} y={21}>
          {f.coleccion.toUpperCase()}
        </text>
        <text x={W - margin} y={21} textAnchor="end">
          {f.corner.toUpperCase()}
        </text>
      </g>
      <Engraving
        id={`engr-d-${manual.slug}`}
        src={e.src}
        ink={ink}
        x={margin + 10}
        y={36}
        width={W - 2 * margin - 20}
        height={band - 36 - 26}
      />
      <text
        x={W / 2}
        y={band - 12}
        textAnchor="middle"
        fontFamily={SERIF}
        fontSize={5}
        letterSpacing={0.1}
        fill={ink}
        opacity={0.8}
      >
        {e.caption}
      </text>
      <Grain id={`grain-d-${manual.slug}`} opacity={0.1} />
      <rect y={band} width={W} height={H - band} fill={f.colors.background} />
      <TitleBlock
        f={f}
        x={margin}
        firstY={firstY}
        size={size}
        lead={lead}
        anchor="start"
        ink={f.colors.text}
        soft={f.colors.muted}
        kickerSize={7.5}
      />
      <path
        d={`M${margin} 268H${W - margin}`}
        stroke={f.colors.muted}
        strokeWidth={0.25}
      />
      <text
        x={margin}
        y={281}
        fontFamily={SERIF}
        fontSize={7.2}
        letterSpacing={0.1}
        fill={f.colors.text}
      >
        {AUTOR}
      </text>
      <text
        x={W - margin}
        y={281}
        textAnchor="end"
        fontFamily={SANS}
        fontSize={4.6}
        fontWeight={600}
        letterSpacing={1}
        fill={f.colors.muted}
      >
        {f.herramientas.toUpperCase()}
      </text>
    </Frame>
  );
}

/** E: Grabado invertido. C's split: the engraving in cream on the coloured field, the title centred on a cream label. */
export function TapaGrabadoInvertido({ manual, className }: Props) {
  const f = facts(manual);
  const e = engraving(manual);
  const band = 180;
  const ink = oklch(...shadeOf(manual, -0.06));
  const lines = f.main.length + (f.tail ? 1 : 0);
  const size = lines > 3 ? 18 : 20;
  const lead = size * 1.08;
  // Centre the title block, kicker included, between the band and the author line.
  const blockTop = band + 14;
  const blockBottom = 258;
  const blockH = (f.kicker ? 10 : 0) + size * 0.72 + (lines - 1) * lead;
  const firstY =
    blockTop +
    (blockBottom - blockTop - blockH) / 2 +
    (f.kicker ? 10 : 0) +
    size * 0.72;
  return (
    <Frame manual={manual} className={className}>
      <rect width={W} height={H} fill={CREAM} />
      <rect width={W} height={band} fill={f.colors.background} />
      <g
        fontFamily={SANS}
        fontSize={5}
        fontWeight={600}
        letterSpacing={0.9}
        fill={f.colors.muted}
      >
        <text x={M} y={18}>
          {f.coleccion.toUpperCase()}
        </text>
        <text x={W - M} y={18} textAnchor="end">
          {f.corner.toUpperCase()}
        </text>
      </g>
      <Engraving
        id={`engr-e-${manual.slug}`}
        src={e.src}
        ink={f.colors.text}
        x={M + 6}
        y={28}
        width={W - 2 * M - 12}
        height={band - 28 - 20}
      />
      <text
        x={W / 2}
        y={band - 8}
        textAnchor="middle"
        fontFamily={SERIF}
        fontStyle="italic"
        fontSize={5.6}
        fill={f.colors.muted}
      >
        {e.caption}
      </text>
      <Grain id={`grain-e-${manual.slug}`} opacity={0.18} />
      <TitleBlock
        f={f}
        x={W / 2}
        firstY={firstY}
        size={size}
        lead={lead}
        anchor="middle"
        ink={ink}
        soft={f.colors.background}
      />
      <text
        x={W / 2}
        y={276}
        textAnchor="middle"
        fontFamily={SERIF}
        fontSize={7.6}
        fill={ink}
      >
        {AUTOR}
      </text>
      <text
        x={W / 2}
        y={285}
        textAnchor="middle"
        fontFamily={SANS}
        fontSize={4.6}
        fontWeight={600}
        letterSpacing={0.8}
        fill={f.colors.background}
      >
        {f.herramientas.toUpperCase()}
      </text>
    </Frame>
  );
}

/**
 * F: Grabado pulido. D with every word on the band and fixed baselines: the cream field holds only the plate and its
 * caption. The Colección names the series and the title names the subject, so neither repeats the other.
 */
export function TapaGrabadoPulido({ manual, className }: Props) {
  const f = facts(manual);
  const e = engraving(manual);
  const band = 170;
  const ink = oklch(...shadeOf(manual, -0.06));
  const size = 22;
  const lead = 23.5;
  return (
    <Frame manual={manual} className={className}>
      <rect width={W} height={H} fill={CREAM} />
      <Engraving
        id={`engr-f-${manual.slug}`}
        src={e.src}
        ink={ink}
        x={M + 8}
        y={18}
        width={W - 2 * M - 16}
        height={band - 18 - 22}
      />
      <text
        x={W / 2}
        y={band - 9}
        textAnchor="middle"
        fontFamily={SERIF}
        fontStyle="italic"
        fontSize={5.6}
        fill={ink}
        opacity={0.85}
      >
        {e.caption}
      </text>
      <Grain id={`grain-f-${manual.slug}`} opacity={0.1} />
      <rect y={band} width={W} height={H - band} fill={f.colors.background} />
      <g fontFamily={SANS} fontSize={5.4} fontWeight={600} letterSpacing={1}>
        <text x={M} y={band + 17} fill={f.colors.text}>
          {f.coleccion.toUpperCase()}
        </text>
        <text x={W - M} y={band + 17} textAnchor="end" fill={f.colors.muted}>
          {f.corner.toUpperCase()}
        </text>
      </g>
      <text
        fontFamily={SERIF}
        fontSize={size}
        fontWeight={430}
        letterSpacing={-0.25}
        fill={f.colors.text}
        style={DISPLAY}
      >
        {f.main.map((line, i) => (
          <tspan key={line} x={M} y={band + 42 + i * lead}>
            {line}
          </tspan>
        ))}
      </text>
      <text x={M} y={284} fontFamily={SERIF} fontSize={8} fill={f.colors.text}>
        {AUTOR}
      </text>
      <text
        x={W - M}
        y={284}
        textAnchor="end"
        fontFamily={SANS}
        fontSize={5}
        fontWeight={600}
        letterSpacing={0.9}
        fill={f.colors.muted}
      >
        {f.herramientas.toUpperCase()}
      </text>
    </Frame>
  );
}

export const VARIANTS = {
  A: { name: "Lámina", Tapa: TapaLamina },
  B: { name: "Numeral", Tapa: TapaNumeral },
  C: { name: "Etiqueta", Tapa: TapaEtiqueta },
  D: { name: "Grabado", Tapa: TapaGrabado },
  E: { name: "Grabado invertido", Tapa: TapaGrabadoInvertido },
  F: { name: "Grabado pulido", Tapa: TapaGrabadoPulido },
} as const;
