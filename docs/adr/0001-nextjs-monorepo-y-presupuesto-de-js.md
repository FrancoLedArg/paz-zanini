# Next.js en un monorepo Turborepo, con el presupuesto de JS redefinido

El encargo original sugería Astro y pedía menos de 50 KB gzip de JS inicial. Elegimos Next.js (TypeScript + Three.js) en `apps/web`, dentro de un monorepo Turborepo con pnpm, porque más adelante se suma en el mismo repo un dashboard para cargar el contenido. Con Next, el runtime base (React y el router) ya supera ese límite, así que el presupuesto pasa a ser: la base de Next, más 50 KB gzip como máximo de código propio en la carga inicial, más 250 KB gzip como máximo en el chunk 3D, con la Sala usable en menos de 2,5 s en una conexión 4G media. El total real se mide y se reporta.

## Considered Options

- **Astro en `apps/web`**: cumplía el presupuesto original al pie de la letra. Se descartó para tener un solo framework en el sitio y en el dashboard.
