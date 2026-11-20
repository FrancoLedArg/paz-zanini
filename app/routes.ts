import {
  index,
  layout,
  type RouteConfig,
  route,
} from "@react-router/dev/routes";

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
  // One layout holds the Hélice, so its 3D canvas stays mounted from one Colección's page to the next.
  layout("routes/colecciones.tsx", [
    index("routes/home.tsx"),
    route("colecciones/:id", "routes/coleccion.tsx"),
  ]),
  route("manuales/:slug", "routes/manual.tsx"),
  route("autor", "routes/autor.tsx"),
  route("archivo", "routes/archivo.tsx"),
  route("contacto", "routes/contacto.tsx"),
  ...devRoutes,
] satisfies RouteConfig;
