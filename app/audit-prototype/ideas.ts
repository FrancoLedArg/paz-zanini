// PROTOTYPE (#77), never merged: the audit's ideas (#74), each its own query param so they combine and can be judged one
// at a time. The first option of each is today's site. The choice persists for the session, so it follows a visitor to
// a Manual page. <html data-<idea>> carries each choice for the CSS (prototype.css).
import { useSyncExternalStore } from "react";

export const IDEAS = {
  grano: ["no", "suave", "medio", "fuerte"],
  escala: ["hoy", "mayor", "max"],
  giro: ["hoy", "firme", "peso"],
  lapiz: ["no", "filtro", "subrayado", "corchete"],
  ficha: ["no", "lado", "pie"],
  abrir: ["corte", "fundido", "vuelo"],
  luz: ["hoy", "clara", "mas"],
} as const;
export type Idea = keyof typeof IDEAS;
export type Choice<I extends Idea> = (typeof IDEAS)[I][number];
type Choices = { [I in Idea]: Choice<I> };
export const IDEA_KEYS = Object.keys(IDEAS) as Idea[];

const TODAY = Object.fromEntries(
  IDEA_KEYS.map((idea) => [idea, IDEAS[idea][0]]),
) as Choices;

let choices: Choices = TODAY;
let read = false;
const listeners = new Set<() => void>();

const valid = (idea: Idea, value: string | null): value is string =>
  value !== null && (IDEAS[idea] as readonly string[]).includes(value);

function load() {
  if (read) return;
  read = true;
  const params = new URLSearchParams(location.search);
  const next = { ...choices } as Record<Idea, string>;
  for (const idea of IDEA_KEYS) {
    const asked = params.get(idea) ?? sessionStorage.getItem(`proto-${idea}`);
    if (valid(idea, asked)) next[idea] = asked;
  }
  choices = next as Choices;
  apply();
}

function apply() {
  for (const idea of IDEA_KEYS)
    document.documentElement.dataset[idea] = choices[idea];
}

export function choose<I extends Idea>(idea: I, value: Choice<I>) {
  choices = { ...choices, [idea]: value };
  sessionStorage.setItem(`proto-${idea}`, value);
  const url = new URL(location.href);
  url.searchParams.set(idea, value);
  history.replaceState(history.state, "", url);
  apply();
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useIdeas(): Choices {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return choices;
    },
    () => TODAY,
  );
}

export const useIdea = <I extends Idea>(idea: I): Choice<I> => useIdeas()[idea];

/** Read outside React (event handlers, the 3D scene). */
export const ideaNow = <I extends Idea>(idea: I): Choice<I> => {
  load();
  return choices[idea];
};
