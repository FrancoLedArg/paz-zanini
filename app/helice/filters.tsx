import { type MouseEvent, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router";

import type { ColeccionId, coleccionesWithCount } from "../catalog/catalog";
import {
  canMove,
  changeColeccion,
  changingTo,
  prewarm,
} from "../shared/movement";

interface Props {
  colecciones: ReturnType<typeof coleccionesWithCount>;
}

/**
 * The Colección filters (#75): the three Colecciones at the top centre of every Hélice page, the only way between them.
 * A navigation of three links, the current one aria-current="page" (NavLink). The current name is in full ink with a
 * drawn underline, the others at half. A tap marks the new one at once, though the URL changes only after the exit,
 * and plays #70's change while the 3D is shown; otherwise it is a plain link.
 */
export function Filters({ colecciones }: Props) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // A tap counts only on the page it was made on: once the page catches up (or Back moves it), it is spent.
  const [tapped, setTapped] = useState<{ id: ColeccionId; on: string }>();
  const tap = tapped?.on === pathname ? tapped.id : undefined;

  const onClick = (
    event: MouseEvent<HTMLAnchorElement>,
    id: ColeccionId,
    path: string,
  ) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    const current = event.currentTarget.getAttribute("aria-current") === "page";
    // The page you are on is a change only when it undoes one under way.
    const change = !current || changingTo() !== null;
    if (change) setTapped({ id, on: pathname });
    if (!change || !canMove()) return;
    event.preventDefault();
    prewarm(id);
    void changeColeccion(id, () => navigate(path));
  };

  return (
    <nav
      aria-label="Colecciones"
      // On a phone a row under the header; on a wider screen on the header's own row, between the logo and the menu.
      className="fixed inset-x-0 top-12 z-10 mx-auto grid w-fit max-w-[calc(100vw-2rem)] grid-cols-[repeat(3,auto)] justify-center text-[13px] leading-none font-medium tracking-[-0.02em] lg:top-1 lg:gap-x-1"
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
            const on = tap ? tap === id : isActive;
            return (
              <span
                className={`relative inline-grid overflow-hidden py-0.5 motion-safe:transition-opacity motion-safe:duration-300 ${on ? "" : "opacity-50 group-hover/filter:opacity-100"}`}
              >
                <span className="text-balance motion-safe:group-hover/filter:animate-turn">
                  {label}
                </span>
                {/* Draws in from the left under the new name; wipes out to the right under the old one. */}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 bottom-0 h-px bg-ink motion-safe:transition-transform ${on ? "origin-left scale-x-100 duration-600 ease-settle motion-safe:delay-150" : "origin-right scale-x-0 duration-450 ease-leave"}`}
                />
              </span>
            );
          }}
        </NavLink>
      ))}
    </nav>
  );
}
