import type { ReactNode } from "react";

// Each motif is a line drawing of its Manual's subject in a 210 × 120 box; the Tapa scales it into its margins.
export const MOTIF_WIDTH = 210;
export const MOTIF_HEIGHT = 120;

/** The x axis most charts sit on, near the bottom of the box. */
const BASELINE = 116;

export type MotifKind = keyof typeof MOTIFS;

type Point = readonly [x: number, y: number];

interface Ink {
  stroke: string;
  fill: string;
}

type Draw = (ink: Ink, random: () => number) => ReactNode;

interface Props {
  kind: MotifKind;
  ink: Ink;
}

export function Motif({ kind, ink }: Props) {
  return (
    <g
      fill="none"
      stroke={ink.stroke}
      strokeWidth={1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {MOTIFS[kind](ink, seededRandom(kind))}
    </g>
  );
}

const MOTIFS = {
  /** A histogram of a bell-shaped sample, with its box plot above. */
  histogram: (ink) => {
    const bins = 13;
    const binWidth = 170 / bins;
    return (
      <>
        {range(bins).map((i) => {
          const height = 92 * gauss((i - 6) / 2.6);
          return (
            <rect
              key={i}
              x={n(20 + i * binWidth)}
              y={n(BASELINE - height)}
              width={n(binWidth)}
              height={n(height)}
              fill={ink.fill}
            />
          );
        })}
        {/* whiskers from 44 to 166, box from Q1 = 82 to Q3 = 128, median at 101 */}
        <path d="M44 8V20M166 8V20M44 14H82M128 14H166" />
        <rect x={82} y={6} width={46} height={16} fill={ink.fill} />
        <path d="M101 6V22" />
        <path d={`M12 ${BASELINE}H198`} />
      </>
    );
  },

  /** Three densities with different centres and spreads. */
  curves: (ink) => (
    <>
      <path d={curve((x) => 100 * gauss((x - 105) / 22))} fill={ink.fill} />
      <path d={curve((x) => 62 * gauss((x - 78) / 36))} />
      <path
        d={curve((x) => 48 * gauss((x - 140) / 18))}
        strokeDasharray="2 3"
      />
      <path d={`M8 ${BASELINE}H202`} />
    </>
  ),

  /** Confidence intervals around a true mean; one of them misses it. */
  intervals: (ink, random) => {
    const trueMean = 105;
    const missing = 7;
    return (
      <>
        <path d={`M${trueMean} 2V118`} strokeDasharray="2 3" />
        {range(11).map((i) => {
          const y = 8 + i * 10.4;
          const centre = i === missing ? 152 : trueMean + (random() - 0.5) * 40;
          const half = 18 + random() * 14;
          return (
            <g key={i}>
              <path d={`M${n(centre - half)} ${n(y)}H${n(centre + half)}`} />
              <circle
                cx={n(centre)}
                cy={n(y)}
                r={2}
                fill={i === missing ? ink.stroke : ink.fill}
              />
            </g>
          );
        })}
      </>
    );
  },

  /** Two empirical distribution functions, the staircases rank tests compare. */
  ranks: (_ink, random) => (
    <>
      {[0, 1].map((sample) => {
        let x = 14;
        let d = `M14 ${BASELINE}`;
        range(12).forEach((step) => {
          x += 8 + random() * 5 + sample * 2;
          d += `H${n(x)}V${n(BASELINE - (step + 1) * 9)}`;
        });
        return (
          <path
            key={sample}
            d={d}
            strokeDasharray={sample ? "2 3" : undefined}
          />
        );
      })}
      <path d={`M14 4V${BASELINE}H200`} />
    </>
  ),

  /** A correlated cloud with its ellipse and the two principal axes. */
  components: (ink, random) => (
    <g transform="translate(105 62) rotate(-28)">
      <ellipse rx={84} ry={34} fill={ink.fill} />
      {range(46).map((i) => (
        <circle
          key={i}
          cx={n(spread(random) * 68)}
          cy={n(spread(random) * 24)}
          r={1.3}
          fill={ink.stroke}
          stroke="none"
        />
      ))}
      <path d="M-92 0H92M86 -4L92 0L86 4" />
      <path d="M0 40V-40M-4 -34L0 -40L4 -34" />
    </g>
  ),

  /** A trending seasonal series, then a forecast whose band widens. */
  series: (ink, random) => {
    const seasonal = (t: number) => 84 - t * 0.9 - 16 * Math.sin(t * 0.9);
    // Time advances one step per 5 units of x; the forecast samples every 2 units so its wave stays smooth.
    const observed = range(30).map((t): Point => [
      6 + t * 5,
      seasonal(t) - random() * 6,
    ]);
    const forecast = range(27).map((i): Point => [
      151 + i * 2,
      seasonal(29 + i * 0.4),
    ]);
    const band = (sign: number) =>
      forecast.map(([x, y], i): Point => [x, y + sign * (2 + i * 0.7)]);
    return (
      <>
        <path
          d={`${polyline([...band(-1), ...band(1).reverse()])}Z`}
          fill={ink.fill}
          stroke="none"
        />
        <path d={polyline(observed)} />
        <path d={polyline(forecast)} strokeDasharray="2 3" />
        <path d={`M6 ${BASELINE}H204`} />
      </>
    );
  },

  /** The seven phases of an analysis along an arc, with the loop back that real projects take. */
  phases: (ink) => {
    const points = range(7).map((i): Point => {
      const angle = Math.PI * (0.95 - (i / 6) * 0.9);
      return [105 + 84 * Math.cos(angle), 110 - 92 * Math.sin(angle)];
    });
    return (
      <>
        <path d={polyline(points)} />
        <path d="M164 46C150 82 70 82 58 60" strokeDasharray="2 3" />
        {points.map(([x, y], i) => (
          <circle
            key={i}
            cx={n(x)}
            cy={n(y)}
            r={i === 0 || i === 6 ? 7 : 5}
            fill={ink.fill}
          />
        ))}
      </>
    );
  },

  /** A data table: header row, gridlines, two selected cells. */
  table: (ink) => {
    const rowHeight = 14;
    const columnWidth = 182 / 6;
    return (
      <>
        <rect x={14} y={6} width={182} height={rowHeight} fill={ink.fill} />
        <rect x={75} y={48} width={30} height={rowHeight} fill={ink.fill} />
        <rect x={135} y={76} width={30} height={rowHeight} fill={ink.fill} />
        {range(9).map((i) => (
          <path key={`row${i}`} d={`M14 ${6 + i * rowHeight}H196`} />
        ))}
        {range(7).map((i) => (
          <path key={`col${i}`} d={`M${n(14 + i * columnWidth)} 6V118`} />
        ))}
      </>
    );
  },

  /** Two clusters with density contours, the first look of exploratory analysis. */
  scatter: (ink, random) => (
    <>
      {[
        { cx: 72, cy: 70, rx: 34, ry: 22 },
        { cx: 146, cy: 42, rx: 28, ry: 18 },
      ].map(({ cx, cy, rx, ry }) => (
        <g key={cx}>
          {[1, 0.66, 0.33].map((level) => (
            <ellipse
              key={level}
              cx={cx}
              cy={cy}
              rx={n(rx * level)}
              ry={n(ry * level)}
              transform={`rotate(-20 ${cx} ${cy})`}
              fill={level === 0.33 ? ink.fill : "none"}
            />
          ))}
          {range(22).map((i) => (
            <circle
              key={i}
              cx={n(cx + spread(random) * rx)}
              cy={n(cy + spread(random) * ry)}
              r={1.3}
              fill={ink.stroke}
              stroke="none"
            />
          ))}
        </g>
      ))}
      <path d={`M12 4V${BASELINE}H200`} />
    </>
  ),

  /** From a question, through the steps of a project, to a decision. */
  path: (ink) => {
    const steps: Point[] = [
      [62, 58],
      [92, 30],
      [124, 66],
      [140, 40],
    ];
    return (
      <>
        <path d="M30 96C60 96 50 30 92 30S124 92 160 92" />
        <path d="M92 30C110 30 120 50 140 40" strokeDasharray="2 3" />
        {/* the question: a circle holding a question mark */}
        <circle cx={30} cy={96} r={10} fill={ink.fill} />
        <path d="M26.5 92.5a3.5 3.5 0 1 1 3.5 4v2.5M30 102.2v.1" />
        {steps.map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r={5} fill={ink.fill} />
        ))}
        {/* the decision: a diamond */}
        <path d="M172 80L184 92L172 104L160 92Z" fill={ink.fill} />
      </>
    );
  },

  /** A dashboard: a bar chart, a gauge and a trend line in their tiles. */
  tiles: (ink) => (
    <>
      <rect x={14} y={6} width={86} height={50} rx={3} />
      <rect x={110} y={6} width={86} height={50} rx={3} />
      <rect x={14} y={66} width={182} height={50} rx={3} />
      {[18, 30, 24, 36, 28, 40].map((height, i) => (
        <rect
          key={i}
          x={22 + i * 12}
          y={48 - height}
          width={8}
          height={height}
          fill={ink.fill}
        />
      ))}
      {/* the gauge: a full ring with a thick arc for the value */}
      <circle cx={153} cy={31} r={15} />
      <path d="M153 16A15 15 0 1 1 138.4 34.5" strokeWidth={4} />
      <path
        d={polyline(
          range(16).map((i): Point => [
            24 + i * 11,
            100 - 18 * Math.sin(i * 0.6) - i * 1.2,
          ]),
        )}
      />
    </>
  ),

  /** A decision tree: split nodes as circles, leaves as squares. */
  tree: (ink) => {
    const splits: Point[] = [
      [105, 10],
      [60, 50],
      [150, 50],
    ];
    const leaves: Point[] = [
      [36, 92],
      [84, 92],
      [128, 92],
      [174, 92],
    ];
    return (
      <>
        <path d="M105 10L60 50M105 10L150 50M60 50L36 92M60 50L84 92M150 50L128 92M150 50L174 92" />
        {splits.map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r={7} fill={ink.fill} />
        ))}
        {leaves.map(([x, y], i) => (
          <rect
            key={x}
            x={x - 9}
            y={y}
            width={18}
            height={18}
            fill={i % 2 ? "none" : ink.fill}
          />
        ))}
      </>
    );
  },

  /** Newton–Raphson on a cubic: each tangent lands closer to the root. */
  tangents: (ink) => {
    const root = 96;
    const axis = 70;
    const f = (x: number) => 0.00008 * (x - root) ** 3 + 0.15 * (x - root);
    const slope = (x: number) => 0.00024 * (x - root) ** 2 + 0.15;
    const y = (x: number) => axis - f(x);
    const xs = [180];
    for (let i = 0; i < 3; i++) {
      const x = xs[i] ?? root;
      xs.push(x - f(x) / slope(x));
    }
    return (
      <>
        <path
          d={polyline(range(78).map((i): Point => [30 + i * 2, y(30 + i * 2)]))}
        />
        <path d={`M8 ${axis}H204`} />
        {xs.slice(0, -1).map((x, i) => {
          const next = xs[i + 1] ?? x;
          return (
            <g key={x}>
              <path
                d={`M${n(x)} ${n(y(x))}L${n(next)} ${axis}`}
                strokeDasharray="2 3"
              />
              <path d={`M${n(next)} ${axis}V${n(y(next))}`} strokeWidth={0.6} />
              <circle cx={n(x)} cy={n(y(x))} r={2.4} fill={ink.fill} />
            </g>
          );
        })}
        <circle cx={root} cy={axis} r={3.2} fill={ink.stroke} />
      </>
    );
  },

  /** A cardiotocograph: fetal heart rate above (with a deceleration), contractions below. */
  trace: (ink, random) => {
    const heartBaseline = 34;
    const deceleration = (i: number) =>
      i > 40 && i < 56 ? -10 * Math.sin(((i - 40) / 16) * Math.PI) : 0;
    const heart = range(96).map((i): Point => [
      6 + i * 2.06,
      heartBaseline +
        3 * Math.sin(i * 0.7) +
        (random() - 0.5) * 7 +
        deceleration(i),
    ]);
    const contractions = (x: number) =>
      40 * gauss((x - 70) / 14) + 34 * gauss((x - 150) / 14);
    return (
      <>
        <path d={polyline(heart)} />
        <path
          d={`M6 ${heartBaseline}H204`}
          strokeDasharray="1 4"
          strokeWidth={0.6}
        />
        <path d={curve(contractions, (value) => 112 - value)} fill={ink.fill} />
        <path d="M6 112H204" />
      </>
    );
  },

  /** A goniometer measuring a joint angle of 60°. */
  goniometer: (ink) => {
    const pivot: Point = [105, 112];
    const radius = 82;
    const angle = Math.PI / 3;
    const at = (r: number, a: number): Point => [
      pivot[0] + r * Math.cos(a),
      pivot[1] - r * Math.sin(a),
    ];
    // A tick every 10°, longer every 30°.
    const ticks = range(19).map((i) => {
      const a = (Math.PI * i) / 18;
      return polyline([at(i % 3 === 0 ? 70 : 76, a), at(radius, a)]);
    });
    const [armX, armY] = at(92, angle);
    const [arcX, arcY] = at(30, angle);
    return (
      <>
        <path d="M23 112A82 82 0 0 1 187 112Z" fill={ink.fill} />
        <path d={ticks.join("")} />
        <path d="M105 112H196" strokeWidth={3} />
        <path d={`M105 112L${n(armX)} ${n(armY)}`} strokeWidth={3} />
        <path
          d={`M135 112A30 30 0 0 0 ${n(arcX)} ${n(arcY)}`}
          strokeDasharray="2 3"
        />
        <circle cx={pivot[0]} cy={pivot[1]} r={4} fill={ink.stroke} />
      </>
    );
  },

  /** A sound source and a decaying waveform. */
  soundwave: (ink) => (
    <>
      {[16, 30, 44].map((r) => (
        <path
          key={r}
          d={`M${24 + r * 0.5} ${60 - r}A${r} ${r} 0 0 1 ${24 + r * 0.5} ${60 + r}`}
        />
      ))}
      <circle cx={24} cy={60} r={6} fill={ink.fill} />
      <path
        d={polyline(
          range(120).map((i): Point => [
            80 + i,
            60 - Math.sin(i * 0.55) * 44 * Math.exp(-i / 55),
          ]),
        )}
      />
      <path d="M80 60H204" strokeDasharray="1 4" strokeWidth={0.6} />
    </>
  ),

  /** A control chart: centre line, control limits, one point out of control. */
  control: (ink, random) => {
    const centre = 60;
    const outlier = 13;
    const points = range(20).map((i): Point => [
      12 + i * 9.8,
      i === outlier ? 10 : centre + (random() - 0.5) * 50,
    ]);
    const [outlierX, outlierY] = points[outlier] ?? [0, 0];
    return (
      <>
        <path d={`M6 ${centre}H204`} />
        <path d="M6 20H204M6 100H204" strokeDasharray="4 3" />
        <path d={polyline(points)} />
        {points.map(([x, y], i) => (
          <circle
            key={i}
            cx={n(x)}
            cy={n(y)}
            r={i === outlier ? 3 : 1.8}
            fill={i === outlier ? ink.stroke : ink.fill}
          />
        ))}
        <circle cx={n(outlierX)} cy={outlierY} r={7} />
      </>
    );
  },

  /** A newspaper page: two columns of text and a chart box. */
  columns: (ink) => (
    <>
      {[14, 82].map((x) => (
        <path
          key={x}
          d={range(11)
            .map((i) => `M${x} ${8 + i * 10.6}H${x + (i === 10 ? 34 : 58)}`)
            .join("")}
        />
      ))}
      <rect x={150} y={8} width={46} height={110} fill={ink.fill} />
      {[30, 52, 40, 74].map((height, i) => (
        <rect
          key={i}
          x={156 + i * 9.5}
          y={112 - height}
          width={6}
          height={height}
        />
      ))}
    </>
  ),

  /** A population pyramid, one age band per row. */
  pyramid: (ink) => (
    <>
      {range(10).map((band) => {
        const width = 82 - band * 7 - (band * band) / 5;
        const y = 108 - band * 11;
        return (
          <g key={band}>
            <rect
              x={n(105 - width)}
              y={y}
              width={n(width)}
              height={9}
              fill={ink.fill}
            />
            <rect x={105} y={y} width={n(width * 0.94)} height={9} />
          </g>
        );
      })}
      <path d="M105 2V118" />
    </>
  ),

  /** A support network: a person at the centre, ties to the people around them, and some ties between those. */
  network: (ink, random) => {
    const centre: Point = [105, 60];
    const count = 12;
    const around = range(count).map((i): Point => {
      const angle = (2 * Math.PI * i) / count + 0.3;
      return [
        centre[0] + Math.cos(angle) * (40 + random() * 50),
        centre[1] + Math.sin(angle) * (26 + random() * 28),
      ];
    });
    const ties = around.flatMap((point, i) => {
      const neighbour = around[(i + 3) % count];
      return [
        polyline([centre, point]),
        ...(i % 3 === 0 && neighbour ? [polyline([point, neighbour])] : []),
      ];
    });
    return (
      <>
        <path d={ties.join("")} />
        <circle cx={centre[0]} cy={centre[1]} r={9} fill={ink.fill} />
        {around.map(([x, y]) => (
          <circle key={x} cx={n(x)} cy={n(y)} r={4.5} fill={ink.fill} />
        ))}
      </>
    );
  },
} satisfies Record<string, Draw>;

function range(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i);
}

function gauss(z: number): number {
  return Math.exp((-z * z) / 2);
}

/** Two-decimal coordinates keep the SVG small and identical between prerender and hydration. */
function n(value: number): number {
  return Math.round(value * 100) / 100;
}

function polyline(points: readonly Point[]): string {
  return points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${n(x)} ${n(y)}`)
    .join("");
}

/** A function of x drawn across the box; by default its value counts up from the baseline. */
function curve(
  height: (x: number) => number,
  toY: (value: number) => number = (value) => BASELINE - value,
): string {
  return polyline(
    range(100).map((i): Point => [6 + i * 2, toY(height(6 + i * 2))]),
  );
}

/** Roughly normal in [-1, 1], from the sum of three uniforms. */
function spread(random: () => number): number {
  return (random() + random() + random() - 1.5) / 1.5;
}

/** Deterministic, so a motif draws the same on the server and in the browser. */
function seededRandom(seed: string): () => number {
  let state = 7;
  for (let i = 0; i < seed.length; i++) {
    state = (state * 31 + seed.charCodeAt(i)) | 0;
  }
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
