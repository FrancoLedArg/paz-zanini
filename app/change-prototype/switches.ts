// PROTOTYPE (#84), never merged: the switches for the Colección change. `?cambio=actual|fundido|uno|paso` and
// `?libros=13|7|5`, kept in sessionStorage so they survive navigation; read once at load (the bar reloads on a pick), so
// the scene's constants and the movement can read them as plain values.

export const CAMBIOS = {
  actual: "hoy: la hélice acelera hacia arriba y la nueva entra desde abajo",
  fundido:
    "los libros se disuelven en el papel donde están; los nuevos salen del papel, el del centro sube un poco",
  uno: "cada libro baja y se apaga solo, de los lejanos al del centro; los nuevos suben igual",
  paso: "un giro corto que frena, del tamaño de un paso de scroll, mientras los libros se apagan",
} as const;
export type Cambio = keyof typeof CAMBIOS;
export const LIBROS = ["13", "7", "5"] as const;
export type Libros = (typeof LIBROS)[number];

function read<T extends string>(
  name: string,
  options: readonly T[],
  fallback: T,
): T {
  if (typeof window === "undefined") return fallback;
  const asked =
    new URLSearchParams(location.search).get(name) ??
    sessionStorage.getItem(name);
  // Trust boundary: a URL param is only an option once it is one of the keys.
  const value = options.includes(asked as T) ? (asked as T) : fallback;
  sessionStorage.setItem(name, value);
  return value;
}

export const cambio = read(
  "cambio",
  Object.keys(CAMBIOS) as Cambio[],
  "actual",
);
export const libros = read("libros", LIBROS, "13");

/** Sets a switch and reloads, so the next change is measured from a clean page. */
export function choose(name: "cambio" | "libros", value: string) {
  sessionStorage.setItem(name, value);
  const url = new URL(location.href);
  url.searchParams.set(name, value);
  location.assign(url);
}
