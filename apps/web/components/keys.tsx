"use client";

import { useEffect } from "react";

/**
 * Keyboard shortcuts for the whole site: ↑ ↓ walk the drawers or Carpetas, ← → step through the Escritorio,
 * Esc goes up a level. Pages opt in by marking their links: `data-esc`, `data-dir="prev|next"`, `.drawer-front`, `.carpeta`.
 */
export function Keys() {
  useEffect(() => {
    const click = (selector: string) => document.querySelector<HTMLElement>(selector)?.click();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") return click("[data-esc]");
      if (e.key === "ArrowLeft") return click('[data-dir="prev"]');
      if (e.key === "ArrowRight") return click('[data-dir="next"]');
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;

      const items = [...document.querySelectorAll<HTMLElement>(".drawer-front, .carpeta")];
      if (items.length === 0) return;
      const current = items.indexOf(document.activeElement as HTMLElement);
      const next = e.key === "ArrowDown" ? Math.min(items.length - 1, current + 1) : Math.max(0, current - 1);
      e.preventDefault();
      items[next].focus();
      items[next].scrollIntoView({ block: "nearest" });
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
  return null;
}
