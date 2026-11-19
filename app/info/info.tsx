import type { ReactNode } from "react";

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
    </div>
  );
}
