import type { Route } from "./+types/home";

export const meta: Route.MetaFunction = () => [
  { title: "Manuales · Raúl E. Paz Zanini" },
  {
    name: "description",
    content:
      "Manuales gratuitos de estadística y ciencia de datos de Raúl E. Paz Zanini.",
  },
];

// shortcut: placeholder until la Pila ships, replace with the archive (ADR 0001).
export default function Home() {
  return (
    <main>
      <h1>Manuales</h1>
    </main>
  );
}
