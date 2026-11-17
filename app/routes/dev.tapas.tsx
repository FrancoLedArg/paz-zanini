import { Lomo, MANUALES, Tapa } from "../tapa/tapa";

// Design review: every Tapa and Lomo at once. Development only (see app/routes.ts).
export default function DevTapas() {
  return (
    <main className="mx-auto max-w-6xl space-y-12 p-4 font-sans sm:p-8">
      <h1 className="text-2xl font-semibold">Tapas</h1>
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {MANUALES.map((manual) => (
          <Tapa
            key={manual.slug}
            manual={manual}
            className="w-full shadow-md"
          />
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
