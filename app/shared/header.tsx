import { Link } from "react-router";

import { Menu } from "./menu";

interface LogoProps {
  /** Its size and place: quiet in a page's header, larger in the Hélice pages' bottom-left corner. */
  className?: string;
}

/** The Autor's name as the logo, linking home. */
export function Logo({ className = "" }: LogoProps) {
  return (
    <Link
      to="/"
      className={`inline-flex min-h-11 items-center font-serif tracking-tight outline-offset-4 focus-visible:outline-2 focus-visible:outline-ink ${className}`}
    >
      Raúl E. Paz Zanini
    </Link>
  );
}

interface Props {
  /** Where the page places it: fixed over the Hélice on its pages, in flow on every other page. */
  className?: string;
  /** False on the Hélice pages, which set the logo in their bottom-left corner instead (#77). */
  logo?: boolean;
}

/** The site's header: the logo at the left, and the menu at the right. */
export function Header({ className = "", logo = true }: Props) {
  return (
    <header className={`flex items-start justify-between gap-4 ${className}`}>
      {logo && <Logo className="text-base lg:text-lg" />}
      <Menu />
    </header>
  );
}
