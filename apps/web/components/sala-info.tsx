"use client";

import { useEffect, useState } from "react";
import { Ficha } from "./ficha";
import { SALA_EVENT, type CajonData, type SalaEventDetail } from "./sala-3d/types";

/** In the Sala, the text of what's open in the 3D Archivador: the drawer's Serie, or the Ficha of the Carpeta under the pointer. */
export function SalaInfo({ cajones }: { cajones: CajonData[] }) {
  const [abierto, setAbierto] = useState<SalaEventDetail>({ cajon: -1, carpeta: -1 });

  useEffect(() => {
    const onSala = (e: Event) => setAbierto((e as CustomEvent<SalaEventDetail>).detail);
    window.addEventListener(SALA_EVENT, onSala);
    return () => window.removeEventListener(SALA_EVENT, onSala);
  }, []);

  const cajon = cajones[abierto.cajon];
  if (!cajon) return null;
  const ficha = cajon.carpetas[abierto.carpeta];
  // Not a live region: it changes as the mouse moves over the 3D canvas, which screen readers skip
  // (keyboard users get the DOM drawers, which link to the 2D Cajón instead).
  return (
    <aside className="sala-info">
      <span className="eyebrow">{cajon.numeral} · {cajon.nombre}</span>
      {ficha ? (
        <Ficha f={ficha} />
      ) : (
        <>
          <h2>{cajon.titulo}</h2>
          <p className="how">Pasá el cursor por las carpetas para leer su ficha; clic para abrir una. Esc cierra el cajón.</p>
        </>
      )}
    </aside>
  );
}
