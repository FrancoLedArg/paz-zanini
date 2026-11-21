import {
  type CSSProperties,
  type RefObject,
  useLayoutEffect,
  useState,
} from "react";

import { stepInView } from "../shared/track";

/** How long the scroll stays still before the Hélice counts as resting: a snap has finished by then. */
const REST_MS = 140;
/** How close to a step's centre counts as resting on it, in steps. */
const ON_STEP = 0.04;

/**
 * The step the scroll last came to rest on, and whether it rests there now: false from the first scroll event until
 * it is still again on a step.
 */
function useRest(track: RefObject<HTMLElement | null>) {
  const [rest, setRest] = useState({ step: 0, settled: false });
  useLayoutEffect(() => {
    let timer = 0;
    const check = () => {
      if (!track.current) return;
      const at = stepInView(track.current);
      const step = Math.round(at);
      setRest({ step, settled: Math.abs(at - step) < ON_STEP });
    };
    const onScroll = () => {
      setRest((last) => (last.settled ? { ...last, settled: false } : last));
      clearTimeout(timer);
      timer = window.setTimeout(check, REST_MS);
    };
    // A page restored mid-track (Back) shows its book's record without waiting for a scroll.
    check();
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      removeEventListener("scroll", onScroll);
    };
  }, [track]);
  return rest;
}

/** A row's label and value rise in after its hairline has begun to draw. */
const RISE = "motion-safe:group-data-[on=true]/record:animate-rise-in";
const riseDelay = (row: number) => ({ animationDelay: `${0.3 + row * 0.08}s` });

interface Props {
  books: { path: string; title: string; facts: [string, string][] }[];
  track: RefObject<HTMLElement | null>;
}

/**
 * The record of the book in focus (#77): a catalogue record that types in once the Hélice rests on a book, and fades
 * as soon as the scroll moves or a Colección change starts. Under the filters on a phone; on desktop in the bottom-left
 * corner, over the Autor's name. Not a live region: the track's links are the screen-reader path.
 */
export function Record({ books, track }: Props) {
  const { step, settled } = useRest(track);
  const book = books[step];
  if (!book) return null;
  return (
    <section
      // A new book types in afresh.
      key={book.path}
      aria-label="Manual en foco"
      data-on={settled}
      className="group/record pointer-events-none fixed inset-x-4 top-23 z-10 data-[on=false]:opacity-0 motion-safe:transition-opacity motion-safe:duration-250 lg:top-auto lg:right-auto lg:bottom-20 lg:left-5 lg:w-60 moving:opacity-0"
    >
      <p className="font-serif text-record text-balance lg:text-record-lg">
        <span className="sr-only">{book.title}</span>
        <span aria-hidden="true">
          {/* eslint-disable-next-line @typescript-eslint/no-misused-spread -- catalog titles: Spanish letters, no emoji. */}
          {[...book.title].map((letter, index) => (
            <span
              key={index}
              style={{ animationDelay: `${0.1 + index * 0.012}s` }}
              className="motion-safe:group-data-[on=true]/record:animate-type"
            >
              {letter}
            </span>
          ))}
        </span>
      </p>
      {/* Three columns on a phone; on desktop a table of rows, label left and value right. */}
      <dl className="mt-2 grid grid-cols-3 gap-x-3 lg:mt-3 lg:grid-cols-1">
        {book.facts.map(([label, value], row) => (
          // Each row's hairline (::before) draws in, one after another.
          <div
            key={label}
            style={{ "--draw": `${0.15 + row * 0.08}s` } as CSSProperties}
            className="relative pt-1 before:absolute before:inset-x-0 before:top-0 before:h-px before:origin-left before:bg-ink/55 before:[animation-delay:var(--draw)] motion-safe:group-data-[on=true]/record:before:animate-draw-in lg:flex lg:items-baseline lg:justify-between lg:pt-1.5 lg:pb-1"
          >
            <dt
              style={riseDelay(row)}
              className={`text-label text-ink-muted uppercase ${RISE}`}
            >
              {label}
            </dt>
            <dd
              style={riseDelay(row)}
              className={`mt-0.5 text-fact font-medium lg:mt-0 ${RISE}`}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
