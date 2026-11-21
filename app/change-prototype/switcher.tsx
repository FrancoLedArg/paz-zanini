// PROTOTYPE (#84), never merged: the floating bar. ← / → (or the arrows) step through `cambio`; the numbers pick
// `libros`. Shown in production builds too, since speed is judged on one; `?bar=0` hides it for films.
import { useEffect } from "react";

import { useHydrated } from "../shared/hydrated";
import {
  CAMBIOS,
  type Cambio,
  LIBROS,
  cambio,
  choose,
  libros,
} from "./switches";

const KEYS = Object.keys(CAMBIOS) as Cambio[];

export function Switcher() {
  const hydrated = useHydrated();
  const step = (by: number) => {
    const i = KEYS.indexOf(cambio);
    choose("cambio", KEYS[(i + by + KEYS.length) % KEYS.length] ?? "actual");
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest("input, textarea")) return;
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "ArrowRight") step(1);
    };
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
    };
  });
  if (!hydrated || new URLSearchParams(location.search).get("bar") === "0")
    return null;
  const button = "rounded-full px-3 py-1.5 hover:bg-white/15";
  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/85 p-1 font-mono text-xs whitespace-nowrap text-white shadow-lg">
      <button
        type="button"
        onClick={() => {
          step(-1);
        }}
        className={button}
      >
        ←
      </button>
      <span className="px-2" title={CAMBIOS[cambio]}>
        cambio={cambio}
      </span>
      <button
        type="button"
        onClick={() => {
          step(1);
        }}
        className={button}
      >
        →
      </button>
      <span className="px-1 opacity-50">·</span>
      {LIBROS.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => {
            choose("libros", n);
          }}
          className={`${button} ${n === libros ? "bg-white/25" : ""}`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
