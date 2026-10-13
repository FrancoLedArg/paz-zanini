// The data the Sala page hands the 3D Sala, and the event the 3D Sala sends back to the page.
// Kept apart from scene.ts so React components can import it without pulling three.js into their bundle.
import type { Documento } from "@paz/content";
import type { FichaData } from "@/components/ficha";

/** A drawer's Rótulo: numeral, name, range of Signaturas. */
export type RotuloData = { numeral: string; nombre: string; rango: string };

/** A Carpeta: its Ficha, where it opens, and the Motivo its cover shows. */
export type CarpetaData = FichaData & { href: string } & Partial<Pick<Documento, "motivo" | "faltante">>;

/** One drawer of the Archivador: its Rótulo, its Serie's title, its 2D Cajón, and its Carpetas front to back. */
export type CajonData = RotuloData & { titulo: string; href: string; carpetas: CarpetaData[] };

/** Fired on `window` when the open drawer or the Carpeta under the pointer changes. -1 means none. */
export const SALA_EVENT = "sala";
export type SalaEventDetail = { cajon: number; carpeta: number };
