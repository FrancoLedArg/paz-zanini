import { type MouseEvent, useSyncExternalStore } from "react";
import { NavLink, useNavigate } from "react-router";

import type { ColeccionId, coleccionesWithCount } from "../catalog/catalog";
import { Pencil } from "../pencil/pencil";
import {
  canMove,
  changeColeccion,
  changingTo,
  prewarm,
  subscribeToChange,
} from "../shared/movement";

interface Props {
  colecciones: ReturnType<typeof coleccionesWithCount>;
}

/**
 * The Colección filters (#75): the three Colecciones at the top centre of every Hélice page, the only way between them.
 * A navigation of three links, the current one aria-current="page" (NavLink). The current name is in full ink,
 * underlined in pencil; the others are lighter (65%: the half picked on #75 fails AA on paper). A tap marks the new one
 * at once, though the URL changes only after the exit, and plays #70's change while the 3D is shown; otherwise it is a
 * plain link.
 */
export function Filters({ colecciones }: Props) {
  const navigate = useNavigate();
  // Where a change under way is heading: marked from the tap, before the URL catches up.
  const heading = useSyncExternalStore(
    subscribeToChange,
    changingTo,
    () => null,
  );

  const onClick = (
    event: MouseEvent<HTMLAnchorElement>,
    id: ColeccionId,
    path: string,
  ) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    const current = event.currentTarget.getAttribute("aria-current") === "page";
    // The page you are on is a change only when it undoes one under way.
    if (!canMove() || (current && changingTo() === null)) return;
    event.preventDefault();
    prewarm(id);
    void changeColeccion(id, () => navigate(path));
  };

  return (
    <nav
      aria-label="Colecciones"
      // Below lg a row under the header; from lg up on the header's own row, left of the menu.
      className="fixed inset-x-0 top-12 z-10 mx-auto grid w-fit max-w-[calc(100vw-2rem)] grid-cols-[repeat(3,auto)] justify-center text-filter font-medium lg:top-1 lg:gap-x-1"
    >
      {colecciones.map(({ id, name, label, path }, index) => (
        // No `end`: the prerender renders each page at its path with a trailing slash, which `end` wouldn't match.
        <NavLink
          key={path}
          to={path}
          aria-label={name}
          onClick={(event) => {
            onClick(event, id, path);
          }}
          style={{ animationDelay: `${300 + index * 70}ms` }}
          // A press springs back. At 320 px a long name wraps onto two lines.
          className="group/filter flex min-h-11 items-center justify-center px-1.5 text-center outline-offset-2 [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-ink motion-safe:animate-rise-in motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-spring motion-safe:active:scale-95 motion-safe:active:duration-100"
        >
          {({ isActive }) => {
            const marked = heading ? heading === id : isActive;
            return (
              <span className="relative inline-grid">
                {/* Clipped, so a hover's turn slides the name out of its line. */}
                <span
                  className={`inline-grid overflow-hidden py-0.5 motion-safe:transition-opacity motion-safe:duration-300 ${marked ? "" : "opacity-65 group-hover/filter:opacity-100"}`}
                >
                  <span className="text-balance motion-safe:group-hover/filter:animate-turn">
                    {label}
                  </span>
                </span>
                {/* Under the name, outside its clip: drawn on under the new one, rubbed out under the old. */}
                <Pencil
                  on={marked}
                  seed={index + 1}
                  delay={0.1}
                  className="absolute inset-x-0 -bottom-1 h-1.5"
                />
              </span>
            );
          }}
        </NavLink>
      ))}
    </nav>
  );
}
