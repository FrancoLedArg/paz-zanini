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
    // React Router drops the duplicate `/` (the first Colección's page).
    ...coleccionesWithCount().map(({ path }) => path),
    ...MANUALES.map(manualPath),
  ],
} satisfies Config;
