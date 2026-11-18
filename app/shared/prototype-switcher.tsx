// PROTOTYPE, throwaway: cycles a route's `?variant=` with the arrows or the ← → keys. Never rendered in production.
import { useEffect } from "react";
import { useSearchParams } from "react-router";

interface Props {
  variants: Record<string, string>;
}

export function PrototypeSwitcher({ variants }: Props) {
  const [params, setParams] = useSearchParams();
  const keys = Object.keys(variants);
  const current = params.get("variant") ?? keys[0] ?? "";
  const index = Math.max(0, keys.indexOf(current));

  const go = (step: number) => {
    const next = keys[(index + step + keys.length) % keys.length] ?? current;
    setParams({ variant: next }, { replace: true });
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable]")) return;
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  });

  if (!import.meta.env.DEV) return null;
  return (
    <nav
      aria-label="Variantes del prototipo"
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black px-2 py-1 text-sm text-white shadow-lg"
    >
      <button
        type="button"
        onClick={() => {
          go(-1);
        }}
        aria-label="Anterior"
        className="min-h-11 min-w-11"
      >
        ←
      </button>
      <span className="min-w-40 text-center font-medium">
        {current} · {variants[current]}
      </span>
      <button
        type="button"
        onClick={() => {
          go(1);
        }}
        aria-label="Siguiente"
        className="min-h-11 min-w-11"
      >
        →
      </button>
    </nav>
  );
}
