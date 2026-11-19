import { useRouteLoaderData, useSearchParams } from "react-router";

import type { loader } from "../root";
import { useHydrated } from "./hydrated";

/** Every Colección in catalog order, with its id, name and count of Manuales, from the root loader. */
export function useColecciones() {
  return useRouteLoaderData<typeof loader>("root")?.colecciones ?? [];
}

/**
 * The Colección the home page is filtered to (`?coleccion=<id>`). Null means every Manual: no param, an unknown id,
 * or the prerendered page still hydrating (it holds every Manual, so the filter applies only once hydrated).
 */
export function useColeccionFilter() {
  const [params] = useSearchParams();
  const hydrated = useHydrated();
  const colecciones = useColecciones();
  if (!hydrated) return null;
  const id = params.get("coleccion");
  return colecciones.find((coleccion) => coleccion.id === id)?.id ?? null;
}
