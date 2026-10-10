"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import type { Sala } from "./scene";

/** The 3D Sala. Lives in the root layout so the WebGL context survives navigation; it only draws on "/". */
export function Sala3D() {
  const ref = useRef<HTMLCanvasElement>(null);
  const sala = useRef<Promise<Sala | null>>(null);
  const pathname = usePathname();

  useEffect(() => {
    const cab = document.querySelector<HTMLElement>(".s-room .cab-wrap");
    const fbox = document.querySelector<HTMLElement>(".s-room .fbox");
    if (!cab || !fbox || !ref.current) return;
    const canvas = ref.current;
    // Without WebGL the 2D Sala simply stays.
    sala.current ??= import("./scene").then((m) => m.mountSala(canvas)).catch(() => null);
    let detach: (() => void) | undefined, gone = false;
    sala.current.then((s) => {
      if (s && !gone) detach = s.attach(cab, fbox, () => (document.documentElement.dataset.sala = "3d"));
    });
    return () => {
      gone = true;
      detach?.();
      delete document.documentElement.dataset.sala;
    };
  }, [pathname]);

  return <canvas ref={ref} className="sala3d" aria-hidden="true" />;
}
