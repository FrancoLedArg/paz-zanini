import { InfoPage } from "../info/info";
import type { Route } from "./+types/autor";

export const meta: Route.MetaFunction = () => [
  { title: "Sobre el Autor · Raúl E. Paz Zanini" },
  {
    name: "description",
    content:
      "Quién es Raúl E. Paz Zanini, Magíster en Ciencia de Datos y autor de los Manuales.",
  },
];

export default function Autor() {
  return (
    <InfoPage title="Sobre el Autor">
      {/* PLACEHOLDER copy, until the Autor's own text arrives (spec #57, a later ticket). */}
      <p>
        Raúl E. Paz Zanini es Magíster en Ciencia de Datos. Escribe Manuales
        gratuitos de estadística y ciencia de datos para que cualquiera pueda
        aprender, venga de la carrera que venga.
      </p>
      <p>La estadística no es solo para matemáticos: es para vos.</p>
    </InfoPage>
  );
}
