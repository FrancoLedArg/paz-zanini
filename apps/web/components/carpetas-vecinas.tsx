import Link from "next/link";

type Vecina = { rotulo: string; href: string };

/** On an Escritorio: links to the previous and next Carpeta of the same Cajón (← → also follow them, see keys.tsx). */
export function CarpetasVecinas({ prev, next, posicion }: { prev?: Vecina; next?: Vecina; posicion: string }) {
  return (
    <nav className="dnav" aria-label="Carpetas vecinas">
      {prev ? (
        <Link href={prev.href} data-dir="prev" aria-label={`Carpeta anterior: ${prev.rotulo}`}>← {prev.rotulo}</Link>
      ) : (
        <span className="off">← Inicio</span>
      )}
      <span className="pos">{posicion}</span>
      {next ? (
        <Link href={next.href} data-dir="next" aria-label={`Carpeta siguiente: ${next.rotulo}`}>{next.rotulo} →</Link>
      ) : (
        <span className="off">Fin →</span>
      )}
    </nav>
  );
}
