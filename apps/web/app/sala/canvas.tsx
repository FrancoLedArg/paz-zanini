"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type { CarpetaLabel, Label, Sala } from "./scene";

type Props = { cajones: (Label & { carpetas: CarpetaLabel[] })[] };

const CAB = ".s-room .cab-wrap";

/**
 * The 3D Sala. Lives in the root layout so the WebGL context survives navigation; on "/" it draws the Archivador into
 * the DOM slot. html[data-sala="3d"] says the canvas is showing it.
 */
export function Sala3D({ cajones }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const st = useRef<{ sala?: Promise<Sala | null> }>({}).current;

  // Without WebGL the 2D Sala simply stays.
  const load = () => (st.sala ??= import("./scene").then((m) => m.mountSala(ref.current!, cajones, (href) => router.push(href))).catch(() => null));

  // The Sala binds on every visit to "/".
  useEffect(() => {
    const cab = document.querySelector<HTMLElement>(CAB);
    if (!cab) return;
    let gone = false, detach: (() => void) | undefined;
    load().then((s) => { if (s && !gone) detach = s.attach(cab, () => (document.documentElement.dataset.sala = "3d")); });
    return () => { gone = true; detach?.(); delete document.documentElement.dataset.sala; };
  }, [pathname]);

  return <canvas ref={ref} className="sala3d" aria-hidden="true" />;
}
