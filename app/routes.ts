import { type RouteConfig, index, route } from "@react-router/dev/routes";

// Design-review pages exist only in development, so they are never prerendered or shipped.
const devRoutes =
  process.env.NODE_ENV === "production"
    ? []
    : [route("dev/tapas", "routes/dev.tapas.tsx")];

export default [index("routes/home.tsx"), ...devRoutes] satisfies RouteConfig;
