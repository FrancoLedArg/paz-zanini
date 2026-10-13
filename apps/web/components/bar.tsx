import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

/** Header: brand and crumbs (the last one is the current page). */
export function Bar({ crumbs }: { crumbs: [label: string, href: string][] }) {
  const parts: [string, string][] = [["Archivo", "/"], ...crumbs];
  return (
    <header className="bar">
      <Link className="mark" href="/">Archivo Paz Zanini</Link>
      <nav className="crumbs" aria-label="Ubicación en el archivo">
        {parts.map(([label, href], i) => (
          <span key={href} className="contents">
            {i > 0 ? <span className="sep" aria-hidden="true">/</span> : null}
            <Link href={href} aria-current={i === parts.length - 1 ? "page" : undefined}>{label}</Link>
          </span>
        ))}
      </nav>
      <ThemeToggle />
    </header>
  );
}
