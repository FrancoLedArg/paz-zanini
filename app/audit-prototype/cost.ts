// PROTOTYPE (#77): each idea's first-paint JS, minified and gzipped on its own (shared site modules excluded).
// node app/audit-prototype/cost.ts
import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { rolldown } from "../../node_modules/.pnpm/rolldown@1.2.19/node_modules/rolldown/dist/index.mjs";

const here = new URL(".", import.meta.url).pathname;
const pieces: Record<string, string> = {
  "shared: the param store and the dev bar": `export { AuditPrototype } from "./prototype.tsx";`,
  "giro=peso: the flick controller": `export { startFlick } from "./settle.ts";`,
  "lapiz: the pencil and the book mark": `export { Pencil, BookMark } from "./prototype.tsx";`,
  "ficha: the record": `export { Record } from "./prototype.tsx";`,
};
const sizeOf = async (source: string) => {
  const bundle = await rolldown({
    input: "entry",
    cwd: here,
    external: (id) => /^react|\.css$|\/shared\/|\/book\//.test(id),
    plugins: [
      {
        name: "entry",
        resolveId: (id) => (id === "entry" ? id : null),
        load: (id) => (id === "entry" ? source : null),
      },
    ],
  });
  const { output } = await bundle.generate({ minify: true, format: "esm" });
  return gzipSync(output[0].code).length;
};
const store = await sizeOf(`export { useIdeas, choose } from "./ideas.ts";`);
console.log(`ideas store alone: ${(store / 1024).toFixed(2)} KiB`);
for (const [name, source] of Object.entries(pieces))
  console.log(
    `${name}: ${((await sizeOf(source)) / 1024).toFixed(2)} KiB gzip (store included: ${(store / 1024).toFixed(2)})`,
  );
const css = readFileSync(`${here}prototype.css`);
console.log(
  `prototype.css: ${(gzipSync(css).length / 1024).toFixed(2)} KiB gzip (grain tile ~0.4 KiB of it)`,
);
