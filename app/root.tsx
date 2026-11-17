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

import "@fontsource-variable/fraunces";
import "@fontsource-variable/instrument-sans";

import type { Route } from "./+types/root";
import "./app.css";

interface Props {
  children: ReactNode;
}

export function Layout({ children }: Props) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-paper font-sans text-ink antialiased">
        {children}
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
      <h1 className="font-serif text-3xl font-semibold">
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
