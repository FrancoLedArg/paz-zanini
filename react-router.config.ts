import type { Config } from "@react-router/dev/config";

// ADR 0002: no runtime server; every route is prerendered to static HTML.
export default {
  ssr: false,
  prerender: true,
} satisfies Config;
