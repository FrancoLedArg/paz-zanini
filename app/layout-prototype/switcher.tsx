// PROTOTYPE (#30), never merged: the floating variant switcher.
import { useEffect } from "react";
import { useSearchParams } from "react-router";

export const VARIANTS = { A: "Regla", B: "Índice-tapa", C: "Cintas" } as const;
export type Variant = keyof typeof VARIANTS;

export function useVariant(): Variant {
  const [params] = useSearchParams();
  const v = params.get("variant") ?? "A";
  return Object.hasOwn(VARIANTS, v) ? (v as Variant) : "A";
}

export function Switcher() {
  const variant = useVariant();
  const [params, setParams] = useSearchParams();
  const keys = Object.keys(VARIANTS) as Variant[];
  const go = (step: number) => {
    const next =
      keys[(keys.indexOf(variant) + step + keys.length) % keys.length] ?? "A";
    const p = new URLSearchParams(params);
    p.set("variant", next);
    setParams(p, { replace: true, preventScrollReset: true });
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        e.target.closest("input,textarea,[contenteditable]")
      )
        return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("keydown", onKey);
    };
  });
  if (import.meta.env.PROD) return null;
  return (
    <div className="fixed bottom-3 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black px-2 py-1 font-mono text-xs text-white shadow-lg">
      <button
        type="button"
        onClick={() => {
          go(-1);
        }}
        className="size-8"
      >
        ←
      </button>
      <span className="px-2 whitespace-nowrap">
        {variant} ({VARIANTS[variant]})
      </span>
      <button
        type="button"
        onClick={() => {
          go(1);
        }}
        className="size-8"
      >
        →
      </button>
    </div>
  );
}
