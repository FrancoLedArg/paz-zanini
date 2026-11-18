import "@fontsource-variable/newsreader/opsz.css";
import "@fontsource-variable/newsreader/opsz-italic.css";
import "@fontsource-variable/hanken-grotesk";
import { useSearchParams } from "react-router";

import { MANUALES } from "../catalog/catalog";
import { PrototypeSwitcher } from "../shared/prototype-switcher";
import { Lomo, Tapa } from "../tapa/tapa";
import { PROTOTYPE_MANUALES, VARIANTS } from "../tapa/tapa.prototype";

// Design review: every Tapa and Lomo at the sizes a visitor meets them. Development only (see app/routes.ts).
// PROTOTYPE: `?variant=A|B|C` shows an editorial Tapa system on one Manual per colour family; `actual` is today's.
const NAMES = {
  D: VARIANTS.D.name,
  F: VARIANTS.F.name,
  E: VARIANTS.E.name,
  A: VARIANTS.A.name,
  B: VARIANTS.B.name,
  C: VARIANTS.C.name,
  actual: "Hoy",
};

export default function DevTapas() {
  const [params] = useSearchParams();
  const variant = params.get("variant") ?? "D";
  const Prototype =
    variant in VARIANTS
      ? VARIANTS[variant as keyof typeof VARIANTS].Tapa
      : Tapa;
  return (
    <main className="mx-auto max-w-7xl space-y-12 p-4 pb-24 sm:p-8">
      <h1 className="text-2xl font-semibold">
        Tapas ·{" "}
        {variant in NAMES ? NAMES[variant as keyof typeof NAMES] : variant}
      </h1>
      <section className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
        {PROTOTYPE_MANUALES.map((manual) => (
          <Prototype
            key={manual.slug}
            manual={manual}
            className="w-full shadow-tapa"
          />
        ))}
      </section>
      <h2 className="text-xl font-semibold">Hélice</h2>
      <section className="flex flex-wrap gap-3">
        {PROTOTYPE_MANUALES.map((manual) => (
          <Prototype
            key={manual.slug}
            manual={manual}
            className="w-28 shadow-tapa"
          />
        ))}
      </section>
      {variant === "actual" && (
        <>
          <h2 className="text-xl font-semibold">Lomos</h2>
          <section>
            {MANUALES.map((manual) => (
              <Lomo
                key={manual.slug}
                manual={manual}
                className="block w-full"
              />
            ))}
          </section>
        </>
      )}
      <PrototypeSwitcher variants={NAMES} />
    </main>
  );
}
