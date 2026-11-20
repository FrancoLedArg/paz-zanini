import type { Config } from "@react-router/dev/config";

import {
  coleccionesWithCount,
  MANUALES,
  manualPath,
} from "./app/catalog/catalog";

// ADR 0002: no runtime server; every route is prerendered to static HTML.
export default {
  ssr: false,
  prerender: ({ getStaticPaths }) => [
    ...getStaticPaths(),
    // The first Colección is the home page, already among the static paths.
    ...coleccionesWithCount()
      .map(({ path }) => path)
      .filter((path) => path !== "/"),
    ...MANUALES.map(manualPath),
  ],
} satisfies Config;
