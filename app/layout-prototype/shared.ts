// PROTOTYPE (#30), never merged: shared state for the first-view variants.
import { useEffect, useState } from "react";

import { trackList } from "../book/track";

export interface ProtoBook {
  path: string;
  title: string;
  lomo: string;
  color: string;
  coleccionId: string;
  coleccion: string;
  step?: number | undefined;
  carrera?: string | undefined;
  herramientas: string;
}

export interface Group {
  id: string;
  name: string;
  color: string;
  books: { book: ProtoBook; index: number }[];
}

export function groups(books: ProtoBook[]): Group[] {
  const out: Group[] = [];
  books.forEach((book, index) => {
    let group = out.find((g) => g.id === book.coleccionId);
    if (!group) {
      group = {
        id: book.coleccionId,
        name: book.coleccion,
        color: book.color,
        books: [],
      };
      out.push(group);
    }
    group.books.push({ book, index });
  });
  return out;
}

const pila = () =>
  document.querySelector<HTMLOListElement>('ol[aria-label="La Pila"]');

/** The book in focus: whose flat Lomo sits nearest the screen centre, as the 3D Pila has it. Also writes the fractional position to `--pila-at`. */
export function useFocus(): number {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const centres = Array.from(pila()?.children ?? [], (item) => {
        const rect = item.getBoundingClientRect();
        return rect.top + rect.height / 2;
      });
      const at = trackList(centres, innerHeight / 2).index;
      document.documentElement.style.setProperty("--pila-at", String(at));
      setIndex(Math.round(at));
    };
    const schedule = () => {
      frame ||= requestAnimationFrame(measure);
    };
    measure();
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
    };
  }, []);
  return index;
}

/** Scrolls la Pila so book `index` sits at the screen centre, where it comes into focus. */
export function focusBook(index: number) {
  const item = pila()?.children[index];
  if (!item) return;
  const rect = item.getBoundingClientRect();
  scrollTo({
    top: scrollY + rect.top + rect.height / 2 - innerHeight / 2,
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  });
}

export function rows(book: ProtoBook): [string, string][] {
  return [
    ["Colección", book.coleccion],
    book.carrera
      ? ["Carrera", book.carrera]
      : ["Recorrido", `Paso ${book.step ?? ""}`],
    ["Herramientas", book.herramientas || "Ninguna"],
  ];
}

export const LICENSE =
  "Todos los Manuales son gratuitos, con licencia CC BY-NC-SA 4.0.";
export const ABOUT = "/acerca"; // the info page, #34
