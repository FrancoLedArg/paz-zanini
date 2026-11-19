import { type RouteConfig, index, route } from "@react-router/dev/routes";

// Design-review pages exist only in development, so they are never prerendered or shipped.
// Vite sets NODE_ENV to "production" for `react-router build` before this file is read.
const devRoutes =
  process.env.NODE_ENV === "production"
    ? []
    : [
        route("dev/tapas", "routes/dev.tapas.tsx"),
        route("dev/book", "routes/dev.book.tsx"),
      ];

export default [
  index("routes/home.tsx"),
  route("manuales/:slug", "routes/manual.tsx"),
  route("autor", "routes/autor.tsx"),
  route("archivo", "routes/archivo.tsx"),
  route("contacto", "routes/contacto.tsx"),
  ...devRoutes,
] satisfies RouteConfig;
