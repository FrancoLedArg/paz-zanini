import { InfoPage } from "../info/info";
import type { Route } from "./+types/contacto";

export const meta: Route.MetaFunction = () => [
  { title: "Contacto · Raúl E. Paz Zanini" },
  {
    name: "description",
    content: "Cómo escribirle a Raúl E. Paz Zanini, autor de los Manuales.",
  },
];

export default function Contacto() {
  return (
    <InfoPage title="Contacto">
      {/* PLACEHOLDER copy, until the Autor's contact details arrive (spec #57, a later ticket). No form: the site is static. */}
      <p>
        Muy pronto vas a encontrar acá cómo escribirle a Raúl E. Paz Zanini.
      </p>
    </InfoPage>
  );
}
