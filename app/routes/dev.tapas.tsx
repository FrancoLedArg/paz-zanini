import { MANUALES } from "../catalog/catalog";
import { Lomo, Tapa } from "../tapa/tapa";

// Design review: every Tapa and Lomo at the sizes a visitor meets them. Development only (see app/routes.ts).
export default function DevTapas() {
  return (
    <main className="mx-auto max-w-6xl space-y-12 p-4 font-sans sm:p-8">
      <h1 className="text-2xl font-semibold">Tapas</h1>
      <h2 className="text-xl font-semibold">Manual page</h2>
      <section className="grid gap-6 sm:grid-cols-2">
        {MANUALES.map((manual) => (
          <Tapa
            key={manual.slug}
            manual={manual}
            className="w-full max-w-md shadow-md"
          />
        ))}
      </section>
      <h2 className="text-xl font-semibold">Pila</h2>
      <section className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {MANUALES.map((manual) => (
          <Tapa key={manual.slug} manual={manual} className="w-full" />
        ))}
      </section>
      <h2 className="text-xl font-semibold">Lomos</h2>
      <section>
        {MANUALES.map((manual) => (
          <Lomo key={manual.slug} manual={manual} className="block w-full" />
        ))}
      </section>
    </main>
  );
}
