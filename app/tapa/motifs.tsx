import type { ReactNode } from "react";

// Each motif is a line drawing of its Manual's subject, in a 210 × 120 box (the cover's width).
export const MOTIF_WIDTH = 210;
export const MOTIF_HEIGHT = 120;

export type MotifKind = keyof typeof MOTIFS;

interface Ink {
  stroke: string;
  fill: string;
}

type Draw = (ink: Ink, random: () => number) => ReactNode;

export function Motif({ kind, ink }: { kind: MotifKind; ink: Ink }) {
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
  histogram: (ink) => {
    const bins = 13;
    const width = 170 / bins;
    return (
      <>
        {range(bins).map((i) => {
          const height = 92 * gauss((i - 6) / 2.6);
          return (
            <rect
              key={i}
              x={n(20 + i * width)}
              y={n(116 - height)}
              width={n(width)}
              height={n(height)}
              fill={ink.fill}
            />
          );
        })}
        <path d="M44 8V20M166 8V20M44 14H82M128 14H166" />
        <rect x={82} y={6} width={46} height={16} fill={ink.fill} />
        <path d="M101 6V22" />
        <path d="M12 116H198" />
      </>
    );
  },

  curves: (ink) => (
    <>
      <path d={curve((x) => 100 * gauss((x - 105) / 22))} fill={ink.fill} />
      <path d={curve((x) => 62 * gauss((x - 78) / 36))} />
      <path
        d={curve((x) => 48 * gauss((x - 140) / 18))}
        strokeDasharray="2 3"
      />
      <path d="M8 116H202" />
    </>
  ),

  intervals: (ink, random) => (
    <>
      <path d="M105 2V118" strokeDasharray="2 3" />
      {range(11).map((i) => {
        const y = 8 + i * 10.4;
        const centre = i === 7 ? 152 : 105 + (random() - 0.5) * 40;
        const half = 18 + random() * 14;
        return (
          <g key={i}>
            <path d={`M${n(centre - half)} ${n(y)}H${n(centre + half)}`} />
            <circle
              cx={n(centre)}
              cy={n(y)}
              r={2}
              fill={i === 7 ? ink.stroke : ink.fill}
            />
          </g>
        );
      })}
    </>
  ),

  ranks: (_ink, random) => (
    <>
      {[0, 1].map((series) => {
        let x = 14;
        let d = "M14 116";
        range(12).forEach((step) => {
          x += 8 + random() * 5 + series * 2;
          const y = 116 - (step + 1) * 9;
          d += `H${n(x)}V${n(y)}`;
        });
        return (
          <path
            key={series}
            d={d}
            strokeDasharray={series ? "2 3" : undefined}
          />
        );
      })}
      <path d="M14 4V116H200" />
    </>
  ),

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

  series: (ink, random) => {
    const seasonal = (i: number) => 84 - i * 0.9 - 16 * Math.sin(i * 0.9);
    const observed = range(30).map((i) => [
      6 + i * 5,
      seasonal(i) - random() * 6,
    ]);
    // Time advances one step per 5 units of x; the forecast samples every 2 units so its wave stays smooth.
    const forecast = range(27).map((i) => [
      151 + i * 2,
      seasonal(29 + i * 0.4),
    ]);
    const band = (sign: number) =>
      forecast.map(([x = 0, y = 0], i) => [x, y + sign * (2 + i * 0.7)]);
    return (
      <>
        <path
          d={`${polyline([...band(-1), ...band(1).reverse()])}Z`}
          fill={ink.fill}
          stroke="none"
        />
        <path d={polyline(observed)} />
        <path d={polyline(forecast)} strokeDasharray="2 3" />
        <path d="M6 116H204" />
      </>
    );
  },

  phases: (ink) => {
    const points = range(7).map((i) => {
      const angle = Math.PI * (0.95 - (i / 6) * 0.9);
      return [105 + 84 * Math.cos(angle), 110 - 92 * Math.sin(angle)];
    });
    return (
      <>
        <path d={polyline(points)} />
        <path d="M164 46C150 82 70 82 58 60" strokeDasharray="2 3" />
        {points.map(([x = 0, y = 0], i) => (
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

  table: (ink) => (
    <>
      <rect x={14} y={6} width={182} height={14} fill={ink.fill} />
      <rect x={75} y={48} width={30} height={14} fill={ink.fill} />
      <rect x={135} y={76} width={30} height={14} fill={ink.fill} />
      {range(9).map((i) => (
        <path key={`r${i}`} d={`M14 ${6 + i * 14}H196`} />
      ))}
      {range(7).map((i) => (
        <path key={`c${i}`} d={`M${n(14 + i * 30.33)} 6V118`} />
      ))}
    </>
  ),

  scatter: (ink, random) => (
    <>
      {[
        [72, 70, 34, 22],
        [146, 42, 28, 18],
      ].map(([cx = 0, cy = 0, rx = 0, ry = 0], cluster) => (
        <g key={cluster}>
          {[1, 0.66, 0.33].map((k) => (
            <ellipse
              key={k}
              cx={cx}
              cy={cy}
              rx={n(rx * k)}
              ry={n(ry * k)}
              transform={`rotate(-20 ${cx} ${cy})`}
              fill={k === 0.33 ? ink.fill : "none"}
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
      <path d="M12 4V116H200" />
    </>
  ),

  path: (ink) => (
    <>
      <path d="M30 96C60 96 50 30 92 30S124 92 160 92" />
      <path d="M92 30C110 30 120 50 140 40" strokeDasharray="2 3" />
      <circle cx={30} cy={96} r={10} fill={ink.fill} />
      <path d="M26.5 92.5a3.5 3.5 0 1 1 3.5 4v2.5M30 102.2v.1" />
      {[
        [62, 58],
        [92, 30],
        [124, 66],
        [140, 40],
      ].map(([x = 0, y = 0]) => (
        <circle key={x} cx={x} cy={y} r={5} fill={ink.fill} />
      ))}
      <path d="M172 80L184 92L172 104L160 92Z" fill={ink.fill} />
    </>
  ),

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
      <circle cx={153} cy={31} r={15} />
      <path d="M153 16A15 15 0 1 1 138.4 34.5" strokeWidth={4} />
      <path
        d={polyline(
          range(16).map((i) => [
            24 + i * 11,
            100 - 18 * Math.sin(i * 0.6) - i * 1.2,
          ]),
        )}
      />
    </>
  ),

  tree: (ink) => {
    const nodes: [number, number][] = [
      [105, 10],
      [60, 50],
      [150, 50],
      [36, 92],
      [84, 92],
      [128, 92],
      [174, 92],
    ];
    return (
      <>
        <path d="M105 10L60 50M105 10L150 50M60 50L36 92M60 50L84 92M150 50L128 92M150 50L174 92" />
        {nodes.map(([x, y], i) =>
          i < 3 ? (
            <circle key={i} cx={x} cy={y} r={7} fill={ink.fill} />
          ) : (
            <rect
              key={i}
              x={x - 9}
              y={y}
              width={18}
              height={18}
              fill={i % 2 ? ink.fill : "none"}
            />
          ),
        )}
      </>
    );
  },

  tangents: (ink) => {
    // Newton–Raphson on a cubic: each tangent lands closer to the root.
    const root = 96;
    const axis = 70;
    const f = (x: number) => 0.00008 * (x - root) ** 3 + 0.15 * (x - root);
    const slope = (x: number) => 0.00024 * (x - root) ** 2 + 0.15;
    const y = (x: number) => axis - f(x);
    const xs = [180];
    for (let i = 0; i < 3; i++) {
      const x = xs[i] ?? 0;
      xs.push(x - f(x) / slope(x));
    }
    return (
      <>
        <path d={polyline(range(78).map((i) => [30 + i * 2, y(30 + i * 2)]))} />
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

  trace: (ink, random) => (
    <>
      <path
        d={polyline(
          range(96).map((i) => [
            6 + i * 2.06,
            34 +
              Math.sin(i * 0.7) * 3 +
              (random() - 0.5) * 7 +
              (i > 40 && i < 56
                ? -10 * Math.sin(((i - 40) / 16) * Math.PI)
                : 0),
          ]),
        )}
      />
      <path d="M6 34H204" strokeDasharray="1 4" strokeWidth={0.6} />
      <path
        d={curve(
          (x) => 40 * gauss((x - 70) / 14) + 34 * gauss((x - 150) / 14),
          (v) => 112 - v,
        )}
        fill={ink.fill}
      />
      <path d="M6 112H204" />
    </>
  ),

  goniometer: (ink) => {
    const ticks = range(19).map((i) => {
      const angle = Math.PI * (i / 18);
      const inner = i % 3 === 0 ? 70 : 76;
      return `M${n(105 + inner * Math.cos(angle))} ${n(112 - inner * Math.sin(angle))}L${n(105 + 82 * Math.cos(angle))} ${n(112 - 82 * Math.sin(angle))}`;
    });
    return (
      <>
        <path d="M23 112A82 82 0 0 1 187 112Z" fill={ink.fill} />
        <path d={ticks.join("")} />
        <path d="M105 112L196 112" strokeWidth={3} />
        <path
          d={`M105 112L${n(105 + 92 * Math.cos(1.05))} ${n(112 - 92 * Math.sin(1.05))}`}
          strokeWidth={3}
        />
        <path
          d={`M135 112A30 30 0 0 0 ${n(105 + 30 * Math.cos(1.05))} ${n(112 - 30 * Math.sin(1.05))}`}
          strokeDasharray="2 3"
        />
        <circle cx={105} cy={112} r={4} fill={ink.stroke} />
      </>
    );
  },

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
          range(120).map((i) => [
            80 + i,
            60 - Math.sin(i * 0.55) * 44 * Math.exp(-i / 55),
          ]),
        )}
      />
      <path d="M80 60H204" strokeDasharray="1 4" strokeWidth={0.6} />
    </>
  ),

  control: (ink, random) => {
    const points = range(20).map((i) => [
      12 + i * 9.8,
      i === 13 ? 10 : 60 + (random() - 0.5) * 50,
    ]);
    return (
      <>
        <path d="M6 60H204" />
        <path d="M6 20H204M6 100H204" strokeDasharray="4 3" />
        <path d={polyline(points)} />
        {points.map(([x = 0, y = 0], i) => (
          <circle
            key={i}
            cx={n(x)}
            cy={n(y)}
            r={i === 13 ? 3 : 1.8}
            fill={i === 13 ? ink.stroke : ink.fill}
          />
        ))}
        <circle cx={n(points[13]?.[0] ?? 0)} cy={10} r={7} />
      </>
    );
  },

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
      {[0, 1, 2, 3].map((i) => {
        const height = [30, 52, 40, 74][i] ?? 0;
        return (
          <rect
            key={i}
            x={156 + i * 9.5}
            y={112 - height}
            width={6}
            height={height}
          />
        );
      })}
    </>
  ),

  pyramid: (ink) => (
    <>
      {range(10).map((i) => {
        const width = 82 - i * 7 - (i * i) / 5;
        return (
          <g key={i}>
            <rect
              x={n(105 - width)}
              y={108 - i * 11}
              width={n(width)}
              height={9}
              fill={ink.fill}
            />
            <rect x={105} y={108 - i * 11} width={n(width * 0.94)} height={9} />
          </g>
        );
      })}
      <path d="M105 2V118" />
    </>
  ),

  network: (ink, random) => {
    const nodes = range(13).map((i) =>
      i === 0
        ? [105, 60]
        : [
            105 + Math.cos(i * 0.483 * 4) * (40 + random() * 50),
            60 + Math.sin(i * 0.483 * 4) * (26 + random() * 28),
          ],
    );
    return (
      <>
        {nodes.slice(1).map(([x = 0, y = 0], i) => (
          <path
            key={i}
            d={`M105 60L${n(x)} ${n(y)}${i % 3 === 0 ? `L${n(nodes[((i + 3) % 12) + 1]?.[0] ?? 0)} ${n(nodes[((i + 3) % 12) + 1]?.[1] ?? 0)}` : ""}`}
          />
        ))}
        {nodes.map(([x = 0, y = 0], i) => (
          <circle
            key={i}
            cx={n(x)}
            cy={n(y)}
            r={i === 0 ? 9 : 4.5}
            fill={ink.fill}
          />
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

function polyline(points: readonly (readonly number[])[]): string {
  return points
    .map(([x = 0, y = 0], i) => `${i === 0 ? "M" : "L"}${n(x)} ${n(y)}`)
    .join("");
}

/** A function of x drawn across the box; heights count up from the baseline at y = 116. */
function curve(
  height: (x: number) => number,
  toY: (value: number) => number = (value) => 116 - value,
): string {
  return polyline(range(100).map((i) => [6 + i * 2, toY(height(6 + i * 2))]));
}

/** Roughly normal in [-1, 1], from the sum of three uniforms. */
function spread(random: () => number): number {
  return (random() + random() + random() - 1.5) / 1.5;
}

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
