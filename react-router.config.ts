import type { Config } from "@react-router/dev/config";

import { MANUALES, manualPath } from "./app/catalog/catalog";

// ADR 0002: no runtime server; every route is prerendered to static HTML.
export default {
  ssr: false,
  prerender: ({ getStaticPaths }) => [
    ...getStaticPaths(),
    ...MANUALES.map(manualPath),
  ],
} satisfies Config;
