// PROTOTYPE (#84), never merged: the switch for the Colección change, `?cambio=actual|fundido|uno|paso|fondo`, kept in
// sessionStorage so it survives navigation; read once at load (the bar reloads on a pick), so the scene and the movement
// can read it as a plain value. Round 2: every book is mounted, and a change builds first and moves after.

export const CAMBIOS = {
  actual: "hoy: la hélice acelera hacia arriba y la nueva entra desde abajo",
  fundido:
    "los libros se disuelven en el papel donde están; los nuevos salen del papel, el del centro sube un poco",
  uno: "cada libro baja y se apaga solo, de los lejanos al del centro; los nuevos suben igual",
  paso: "un giro corto que frena, del tamaño de un paso de scroll, mientras los libros se apagan",
  fondo:
    "la hélice se aleja hacia el fondo y el papel la toma por distancia; la nueva viene hacia adelante y se asienta",
} as const;
export type Cambio = keyof typeof CAMBIOS;

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

/** Sets a switch and reloads, so the next change is measured from a clean page. */
export function choose(name: "cambio", value: string) {
  sessionStorage.setItem(name, value);
  const url = new URL(location.href);
  url.searchParams.set(name, value);
  location.assign(url);
}
