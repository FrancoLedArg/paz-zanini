"use client";

import { useEffect, useState } from "react";
import { Ficha, type FichaData } from "./ficha";

/** In a Cajón: the Ficha of whichever Carpeta is hovered or focused, which stays lifted (`.carpeta.on`). */
export function Peek({ fichas }: { fichas: FichaData[] }) {
  const [rotulo, setRotulo] = useState(fichas[0].rotulo);

  // The Carpetas are server-rendered links, so listen on the document and find the one under the event.
  useEffect(() => {
    const onHoverOrFocus = (e: Event) => {
      const carpeta = (e.target as HTMLElement).closest<HTMLElement>(".carpeta");
      if (carpeta?.dataset.code) setRotulo(carpeta.dataset.code);
    };
    document.addEventListener("mouseover", onHoverOrFocus);
    document.addEventListener("focusin", onHoverOrFocus);
    return () => {
      document.removeEventListener("mouseover", onHoverOrFocus);
      document.removeEventListener("focusin", onHoverOrFocus);
    };
  }, []);

  useEffect(() => {
    document.querySelectorAll<HTMLElement>(".carpeta").forEach((f) => f.classList.toggle("on", f.dataset.code === rotulo));
  }, [rotulo]);

  return (
    <aside className="peek">
      <Ficha f={fichas.find((f) => f.rotulo === rotulo)!} />
      <span className="hint">Clic o Enter para abrir la carpeta · ↑ ↓ para recorrer</span>
    </aside>
  );
}
