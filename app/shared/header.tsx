import { Link } from "react-router";

import { ProtoMenu, useOptions } from "../filters-prototype/prototype";

interface Props {
  /** Where the page places it: fixed over the Hélice on the home page, in flow on every other page. */
  className?: string;
}

/** The site's header: the Autor's name as the logo, linking home, and the menu at the right. */
export function Header({ className = "" }: Props) {
  // PROTOTYPE (#75): the menu and the phone logo follow the prototype's options.
  const o = useOptions();
  return (
    <header
      className={`flex flex-wrap items-start justify-between gap-x-4 ${className}`}
    >
      <Link
        to="/"
        className="inline-flex min-h-11 items-center font-serif text-base tracking-tight outline-offset-4 focus-visible:outline-2 focus-visible:outline-ink lg:text-lg"
      >
        {o.phone === "una-fila" ? (
          <>
            <span className="lg:hidden">Paz Zanini</span>
            <span className="max-lg:hidden">Raúl E. Paz Zanini</span>
          </>
        ) : (
          "Raúl E. Paz Zanini"
        )}
      </Link>
      <ProtoMenu />
    </header>
  );
}
