import { Link } from "react-router";

import { Menu } from "./menu";

interface Props {
  /** Where the page places it: fixed over the Hélice on the home page, in flow on every other page. */
  className?: string;
}

/** The site's header: the Autor's name as the logo, linking home, and the menu at the right. */
export function Header({ className = "" }: Props) {
  return (
    <header className={`flex items-start justify-between gap-4 ${className}`}>
      <Link
        to="/"
        className="inline-flex min-h-11 items-center font-serif text-base tracking-tight outline-offset-4 focus-visible:outline-2 focus-visible:outline-ink lg:text-lg"
      >
        Raúl E. Paz Zanini
      </Link>
      <Menu />
    </header>
  );
}
