"use client";

import { createContext, use, useCallback, type ReactNode } from "react";
import type { CajonData } from "./types";

/** What the Sala page hands the 3D Sala: the element to draw into, and what the drawers hold. */
export type SalaSlotData = { element: HTMLElement; cajones: CajonData[] };

/** Provided by Sala3D (root layout). SalaSlot calls it when the Sala page shows up, and with null when it leaves. */
export const SalaSlotContext = createContext<(slot: SalaSlotData | null) => void>(() => {});

/**
 * The Archivador's place on the Sala page. Its children are the 2D drawers, links that work without JavaScript;
 * once Sala3D is ready, it draws the 3D Archivador over this element.
 */
export function SalaSlot({ cajones, children }: { cajones: CajonData[]; children: ReactNode }) {
  const setSlot = use(SalaSlotContext);
  // A ref callback runs when the element is added to the page; the function it returns runs when it's removed.
  const ref = useCallback(
    (element: HTMLDivElement) => {
      setSlot({ element, cajones });
      return () => setSlot(null);
    },
    [setSlot, cajones],
  );
  return (
    <div className="cab-wrap" ref={ref}>
      {children}
    </div>
  );
}
