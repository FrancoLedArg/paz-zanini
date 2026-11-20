import { useRouteLoaderData } from "react-router";

import type { loader } from "../root";

/** Every Colección in catalog order, with its id, name, page and count of Manuales, from the root loader. */
export function useColecciones() {
  return useRouteLoaderData<typeof loader>("root")?.colecciones ?? [];
}
