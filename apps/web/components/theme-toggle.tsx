"use client";

import { isDark } from "@/lib/theme";

/** Flips between light and dark, and remembers the choice (the root layout's inline script applies it before paint). */
export function ThemeToggle() {
  const flip = () => {
    const root = document.documentElement;
    root.dataset.theme = isDark() ? "light" : "dark";
    try {
      localStorage.setItem("theme", root.dataset.theme);
    } catch {
      // Storage blocked (private mode): the theme still flips, it just isn't remembered.
    }
  };
  return (
    <button type="button" className="theme" onClick={flip} aria-label="Cambiar entre tema claro y oscuro">
      <span aria-hidden="true">◐</span>
    </button>
  );
}
