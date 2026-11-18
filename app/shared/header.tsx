import { Link } from "react-router";

interface Props {
  /** Where the page places it: fixed over the Hélice on the home page, in flow on a Manual page. */
  className?: string;
}

/** The site's header: the Autor's name as the logo, linking home. */
export function Header({ className }: Props) {
  return (
    <header className={className}>
      <Link
        to="/"
        className="inline-flex min-h-11 items-center font-serif text-lg tracking-tight outline-offset-4 focus-visible:outline-2 focus-visible:outline-ink lg:text-2xl"
      >
        Raúl E. Paz Zanini
      </Link>
    </header>
  );
}
