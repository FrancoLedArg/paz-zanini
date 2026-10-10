"use client";

import Link from "next/link";
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

/** ↑ ↓ walk the drawers or folders, ← → step through the Escritorio, Esc goes up a level, / opens the Fichero. */
export function Keys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const typing = /input|textarea|select/i.test((e.target as HTMLElement).tagName);
      const click = (sel: string) => document.querySelector<HTMLElement>(sel)?.click();
      if (e.key === "Escape") return click("[data-esc]");
      if (typing) return;
      if (e.key === "/") {
        e.preventDefault();
        const q = document.getElementById("q");
        // Through the header link, so the way to the Fichero is the same as a click: from the Sala, a flight.
        return q ? q.focus() : click("a.find");
      }
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

export type FichaIndice = { rotulo: string; tipo: string; titulo: string; serie: string; donde: string; href: string; texto: string };

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export function Fichero({ fichas, series }: { fichas: FichaIndice[]; series: [string, string][] }) {
  const [q, setQ] = useState("");
  const [serie, setSerie] = useState("all");
  const fq = fold(q.trim());
  const hits = fichas.filter((f) => (serie === "all" || f.serie === serie) && (!fq || fold(f.texto).includes(fq)));
  const hl = (s: string) => {
    const at = fq ? fold(s).indexOf(fq) : -1;
    return at < 0 ? s : <>{s.slice(0, at)}<mark>{s.slice(at, at + fq.length)}</mark>{s.slice(at + fq.length)}</>;
  };
  return (
    <>
      <label className="fi-search" htmlFor="q">
        <span className="sr-only">Buscar</span>
        <input id="q" type="search" autoComplete="off" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por tema, título o signatura (ej. hipótesis, Python, EST-03)" />
      </label>
      <div className="chips" role="group" aria-label="Filtrar por serie">
        {[["all", "Todo"] as [string, string], ...series].map(([id, label]) => (
          <button key={id} type="button" aria-pressed={serie === id} onClick={() => setSerie(id)}>{label}</button>
        ))}
      </div>
      <p className="fi-count" aria-live="polite">n = {hits.length} de {fichas.length} fichas</p>
      {hits.length ? (
        <div className="fi-cards">
          {hits.map((f) => (
            <Link key={f.rotulo} className="icard" href={f.href}>
              <span className="ic"><span>{hl(f.rotulo)}</span><span>{f.tipo.split(" ·")[0]}</span></span>
              <span className="it">{hl(f.titulo)}</span>
              <span className="is">{f.donde}</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="empty">Ninguna ficha coincide. Probá con un tema (hipótesis, Python, salud) o con una signatura como EST-03.</p>
      )}
    </>
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
