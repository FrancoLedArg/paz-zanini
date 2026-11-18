// PROTOTYPE, never merged: links between the three home variants, so they can be compared on a phone.
import { Link, useSearchParams } from "react-router";

const VARIANTS = [
  ["pliego", "Pliego"],
  ["estante", "Estante"],
  ["pila", "Pila"],
] as const;

export function Switcher() {
  const [params] = useSearchParams();
  const current = params.get("variant") ?? "pliego";
  return (
    <nav
      aria-label="Variantes del prototipo"
      className="fixed top-14 right-2 z-50 flex gap-1 rounded-full bg-black/80 px-1.5 py-1 font-mono text-[0.625rem] text-white lg:top-1 lg:right-auto lg:left-1/2 lg:-translate-x-1/2"
    >
      {VARIANTS.map(([key, label]) => (
        <Link
          key={key}
          to={`/?variant=${key}`}
          replace
          className={`rounded-full px-2 py-0.5 ${key === current ? "bg-white text-black" : ""}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
