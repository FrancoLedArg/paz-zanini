"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SalaSlotContext, type SalaSlotData } from "./sala-slot";
import type { Sala } from "./scene";

/**
 * The 3D Sala: a canvas over the whole window that draws the Archivador into the Sala page's SalaSlot.
 * It wraps every page in the root layout, so the WebGL context survives navigation; three.js only loads the first
 * time a SalaSlot shows up. While it's drawing, html[data-sala="3d"] tells the CSS to hide the 2D drawers.
 * Without WebGL, the 2D Sala simply stays.
 */
export function Sala3D({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const salaRef = useRef<Promise<Sala | null>>(null); // created once, then reused on every visit
  const [slot, setSlot] = useState<SalaSlotData | null>(null);
  const router = useRouter();

  // Each time a Sala page shows up, bind the scene to its slot; when it leaves, unbind it.
  useEffect(() => {
    if (!slot) return;

    // The first visit builds the scene with that page's drawers. The content is static, so later visits reuse it.
    salaRef.current ??= import("./scene")
      .then(({ mountSala }) => mountSala(canvasRef.current!, slot.cajones, (href) => router.push(href)))
      .catch((error: unknown) => {
        console.error("The 3D Sala could not start, so the 2D one stays.", error);
        return null;
      });

    let left = false; // the page went away before the scene was ready
    let detach: (() => void) | undefined;
    salaRef.current.then((sala) => {
      if (!sala || left) return;
      detach = sala.attach(slot.element, () => {
        document.documentElement.dataset.sala = "3d";
      });
    });

    return () => {
      left = true;
      detach?.();
      delete document.documentElement.dataset.sala;
    };
  }, [slot, router]);

  return (
    <SalaSlotContext value={setSlot}>
      {children}
      <canvas ref={canvasRef} className="sala3d" aria-hidden="true" />
    </SalaSlotContext>
  );
}
