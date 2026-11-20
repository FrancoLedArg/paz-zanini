import type { ReactNode } from "react";
import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

// The optical-size file without its italic: the site sets no italics.
import "@fontsource-variable/newsreader/opsz.css";
import "@fontsource-variable/hanken-grotesk/wght.css";

import type { Route } from "./+types/root";
import "./app.css";
import { coleccionesWithCount } from "./catalog/catalog";
import { AuditPrototype } from "./audit-prototype/prototype";

// Runs only at build time (ADR 0002): every page's menu lists the Colecciones without shipping the catalog.
export function loader() {
  return { colecciones: coleccionesWithCount() };
}

interface Props {
  children: ReactNode;
}

export function Layout({ children }: Props) {
  return (
    // The home page's first-visit script flags <html> before hydration (app/loader/); this silences <html>'s own attributes only, not its children.
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-paper font-sans text-ink antialiased">
        {children}
        {/* PROTOTYPE (#77). */}
        <AuditPrototype />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const stack =
    import.meta.env.DEV && error instanceof Error ? error.stack : undefined;

  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:px-8">
      <h1 className="font-serif text-3xl">
        {notFound ? "No encontramos esta página" : "Algo salió mal"}
      </h1>
      <Link
        to="/"
        className="mt-6 inline-flex min-h-11 items-center underline underline-offset-4"
      >
        Volver a los Manuales
      </Link>
      {stack && (
        <pre>
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
