import { data } from "react-router";

import { findManual } from "../catalog/catalog";
import { ManualPage } from "../manual/manual";
import type { Route } from "./+types/manual";

export function loader({ params }: Route.LoaderArgs) {
  const manual = findManual(params.slug);
  // eslint-disable-next-line @typescript-eslint/only-throw-error -- React Router renders a thrown 404 in the ErrorBoundary.
  if (!manual) throw data(null, { status: 404 });
  return { manual };
}

// shortcut: no og:image yet, link previews need an absolute raster Tapa; add one once the site has a domain.
export const meta: Route.MetaFunction = ({ loaderData: { manual } }) => [
  { title: `${manual.title} · Raúl E. Paz Zanini` },
  { name: "description", content: manual.subtitle },
  { property: "og:type", content: "book" },
  { property: "og:title", content: manual.title },
  { property: "og:description", content: manual.subtitle },
];

export default function Manual({ loaderData }: Route.ComponentProps) {
  return <ManualPage manual={loaderData.manual} />;
}
