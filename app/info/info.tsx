import type { ReactNode } from "react";
import { Link } from "react-router";

import { ProtoFoot } from "../filters-prototype/prototype";
import { Header } from "../shared/header";

interface Props {
  title: string;
  children: ReactNode;
}

/** A short page of running text about the archive, in the shared layout: the header, then a title and its prose. */
export function InfoPage({ title, children }: Props) {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-8">
      <Header className="py-5" />
      <main className="max-w-prose pt-2 pb-20 md:pt-8">
        <h1 className="font-serif text-3xl leading-tight text-balance sm:text-4xl">
          {title}
        </h1>
        <div className="mt-6 space-y-4 text-pretty [&_a]:underline [&_a]:decoration-rule [&_a]:underline-offset-4 [&_a:hover]:decoration-ink [&_h2]:pt-6 [&_h2]:font-serif [&_h2]:text-xl">
          {children}
        </div>
      </main>
      <ProtoFoot />
    </div>
  );
}

interface LinkListProps {
  /** Each entry: a small-caps label over its links to Manual pages. */
  entries: { label: string; links: { path: string; title: string }[] }[];
}

/** Labelled links to Manual pages, styled like the Manual page's Recorrido. */
export function LinkList({ entries }: LinkListProps) {
  return (
    <ul className="space-y-3">
      {entries.map(({ label, links }) => (
        <li key={label}>
          <p className="text-xs font-semibold tracking-widest text-ink-muted uppercase">
            {label}
          </p>
          {links.map(({ path, title }) => (
            <Link
              key={path}
              to={path}
              className="flex min-h-11 items-center font-serif text-lg text-balance"
            >
              {title}
            </Link>
          ))}
        </li>
      ))}
    </ul>
  );
}
