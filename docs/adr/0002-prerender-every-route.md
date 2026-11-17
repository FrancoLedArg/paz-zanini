# Every route is prerendered to static HTML at build time

Each Manual has a permanent link the Autor can paste into a class group chat, so the page behind it must carry real HTML for search engines and link previews. A plain Vite React SPA serves an empty shell, so we keep Vite + React + TypeScript but prerender every route (home, each Manual, the intro page) to static HTML at build time. The output is a plain static folder, which also keeps hosting open: it runs locally for now and can go to any static host later.

With no server, a URL that was not prerendered (a mistyped Manual link) is answered by React Router's `__spa-fallback.html`, which renders the Spanish not-found page in the browser. Any static host must rewrite unknown paths to that file, as `pnpm preview` does.
