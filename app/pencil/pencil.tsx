import { useId, useLayoutEffect, useRef, useState } from "react";

/** A seeded random, so a mark is uneven but the same on every render. */
function random(seed: number) {
  let s = (seed * 9301 + 49297) % 233280 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** An underline as a hand draws one: a slight bow, rising a touch to the right, ending where the hand lifts. */
export function underline(width: number, seed: number) {
  const next = random(seed);
  const jitter = (amount: number) => (next() - 0.5) * 2 * amount;
  const px = (n: number) => n.toFixed(1);
  const x0 = -2 + jitter(1.5);
  const x1 = width + 2 + jitter(2);
  const y0 = 3 + jitter(0.6);
  const y1 = 3 - Math.min(width * 0.012, 2.5) + jitter(0.6);
  return `M${px(x0)} ${px(y0)} C${px(x0 + width * 0.3)} ${px(y0 + 1 + jitter(0.6))} ${px(x0 + width * 0.72)} ${px(y1 + 0.8 + jitter(0.6))} ${px(x1)} ${px(y1)}`;
}

interface Props {
  /** Drawn on as it turns true (or mounts true), rubbed out as it turns false. */
  on: boolean;
  /** Picks the hand's unevenness; the same seed draws the same mark. */
  seed: number;
  /** Seconds before it starts drawing. */
  delay?: number;
  /** Places the box the mark underlines, across its width. */
  className?: string;
}

/**
 * The site's hand (#77): a graphite underline across its box, drawn on rather than appearing, with a lighter second
 * pass, and rubbed out when it goes. Measured after hydration, so it draws on as the page arrives.
 */
export function Pencil({ on, seed, delay = 0, className = "" }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState(0);
  const filter = useId();
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    const observer = new ResizeObserver(() => {
      setWidth(box.offsetWidth);
    });
    observer.observe(box);
    return () => {
      observer.disconnect();
    };
  }, []);
  const stroke = {
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    pathLength: 1,
    filter: `url(#${filter})`,
  } as const;
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none ${className}`}
    >
      {width > 0 && (
        <svg
          width={width}
          height="100%"
          data-on={on}
          className="pencil block overflow-visible"
        >
          {/* Graphite: the stroke's edge roughened, and broken up by the paper's tooth. */}
          <filter id={filter} x="-5%" y="-60%" width="110%" height="220%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="2"
              seed="3"
              result="wobble"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="wobble"
              scale="1"
              xChannelSelector="R"
              yChannelSelector="G"
              result="rough"
            />
            <feTurbulence
              type="fractalNoise"
              baseFrequency="1.6"
              seed="11"
              result="tooth"
            />
            <feColorMatrix
              in="tooth"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.6 0 0 0 -0.45"
              result="mask"
            />
            <feComposite in="rough" in2="mask" operator="in" />
          </filter>
          <path
            d={underline(width, seed)}
            strokeWidth={1.6}
            style={{ animationDelay: `${delay}s` }}
            {...stroke}
          />
          {/* A second, lighter pass, as a hand goes over the line again. */}
          <path
            d={underline(width * 0.9, seed + 5)}
            strokeWidth={1.1}
            style={{ animationDelay: `${delay + 0.45}s` }}
            className="pencil-again"
            {...stroke}
          />
        </svg>
      )}
    </span>
  );
}
