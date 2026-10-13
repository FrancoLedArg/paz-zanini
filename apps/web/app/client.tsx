"use client";

import { useEffect, useState } from "react";
import { Ficha, type FichaData } from "./ficha";

export const isDark = () => {
  const t = document.documentElement.dataset.theme;
  return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
};

export function ThemeToggle() {
  const flip = () => {
    const r = document.documentElement;
    r.dataset.theme = isDark() ? "light" : "dark";
    try { localStorage.setItem("theme", r.dataset.theme); } catch {}
  };
  return <button type="button" className="theme" onClick={flip} aria-label="Cambiar entre tema claro y oscuro"><span aria-hidden="true">◐</span></button>;
}

/** ↑ ↓ walk the drawers or folders, ← → step through the Escritorio, Esc goes up a level. */
export function Keys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const click = (sel: string) => document.querySelector<HTMLElement>(sel)?.click();
      if (e.key === "Escape") return click("[data-esc]");
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") return click(`[data-dir="${e.key === "ArrowLeft" ? "prev" : "next"}"]`);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const els = [...document.querySelectorAll<HTMLElement>(".dfront, .fld")];
        if (!els.length) return;
        const i = els.indexOf(document.activeElement as HTMLElement);
        const next = e.key === "ArrowDown" ? Math.min(els.length - 1, i + 1) : Math.max(0, i - 1);
        e.preventDefault();
        els[next].focus();
        els[next].scrollIntoView({ block: "nearest" });
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return null;
}

/** The Ficha of whichever folder is hovered or focused in the Cajón. */
export function Peek({ fichas }: { fichas: FichaData[] }) {
  const [rotulo, setRotulo] = useState(fichas[0].rotulo);
  useEffect(() => {
    const on = (e: Event) => {
      const f = (e.target as HTMLElement).closest<HTMLElement>(".fld");
      if (f?.dataset.code) setRotulo(f.dataset.code);
    };
    document.addEventListener("mouseover", on);
    document.addEventListener("focusin", on);
    return () => { document.removeEventListener("mouseover", on); document.removeEventListener("focusin", on); };
  }, []);
  useEffect(() => {
    document.querySelectorAll<HTMLElement>(".fld").forEach((f) => f.classList.toggle("on", f.dataset.code === rotulo));
  }, [rotulo]);
  return (
    <aside className="peek">
      <Ficha f={fichas.find((f) => f.rotulo === rotulo)!} />
      <span className="hint">Clic o Enter para abrir la carpeta · ↑ ↓ para recorrer</span>
    </aside>
  );
}

/** In the Sala, the text of what's open in the 3D Archivador: the drawer's Serie, or the Ficha of the Carpeta under the pointer. */
export function SalaInfo({ cajones }: { cajones: { numeral: string; nombre: string; titulo: string; fichas: FichaData[] }[] }) {
  const [at, setAt] = useState({ cajon: -1, carpeta: -1 });
  useEffect(() => {
    const on = (e: Event) => setAt((e as CustomEvent<typeof at>).detail);
    addEventListener("sala", on);
    return () => removeEventListener("sala", on);
  }, []);
  const c = cajones[at.cajon];
  if (!c) return null;
  const f = c.fichas[at.carpeta];
  return (
    <aside className="sala-info" aria-live="polite">
      <span className="eyebrow">{c.numeral} · {c.nombre}</span>
      {f ? <Ficha f={f} /> : <><h2>{c.titulo}</h2><p className="how">Pasá el cursor por las carpetas para leer su ficha; clic para abrir una. Esc cierra el cajón.</p></>}
    </aside>
  );
}

export function CopyMail() {
  const [label, setLabel] = useState("Copiar");
  const copy = () => {
    const mail = document.getElementById("mail")!;
    const done = (ok: boolean) => { setLabel(ok ? "Copiado" : "Seleccionado"); setTimeout(() => setLabel("Copiar"), 1600); };
    const select = () => { const r = document.createRange(); r.selectNodeContents(mail); getSelection()?.removeAllRanges(); getSelection()?.addRange(r); done(false); };
    navigator.clipboard?.writeText(mail.textContent ?? "").then(() => done(true), select) ?? select();
  };
  return <button className="copy" type="button" onClick={copy}>{label}</button>;
}
