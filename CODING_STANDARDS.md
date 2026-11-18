# Coding standards

How code in this repo is written. `code-review` checks every PR against this file and the sources it names. Anything the tooling already enforces (`tsconfig.json`, `eslint.config.js`, Prettier) is left out here.

## Sources and precedence

When two sources disagree, the higher one wins:

1. `docs/adr/`: decisions already made.
2. This file.
3. The project skills: `book-3d` for anything 3D, `design-system` for anything visible (layout, Tapas, motion, copy).
4. The installed rule skills, with these exceptions:
   - `vercel-react-best-practices`: every `server-*` rule, `async-api-routes`, and anything about `next/*` or server actions does not apply (no runtime server, ADR 0002). Read `bundle-dynamic-imports` as `React.lazy` / route-level splitting.
   - `react-router`: Framework Mode with `ssr: false` and prerender, so routes have no `action` or `headers` exports.
   - `r3f-best-practices` and `three-best-practices`: React 19 passes `ref` as a prop, so `forwardRef` is never used. Rule bodies that are not shipped as files are covered by the quick reference plus Context7.
5. Context7 docs for the installed version: the authority on API facts, never on design.

## Language

- Domain concepts use the `GLOSSARY.md` term as the identifier, without accents (`Manual`, `Coleccion`, `Tapa`). Its avoided synonyms stay out of code too.
- Everything else (technical identifiers, comments, tests, commits) is in English.
- Every string a visitor reads is Spanish, in the voice defined by `design-system`.

## Structure

- `app/routes/`: route modules. They stay thin: read data, compose feature components, export `meta`.
- One folder per feature under `app/` (for example `app/catalog/`, `app/helice/`). Each feature folder has **one entry file named after the folder**, and every other module imports the feature only through it. Files inside the folder are private to it.
- Code shared by two or more features moves to `app/shared/` only once a second user exists.
- Tests sit beside the code they test (`thing.test.ts`). End-to-end journeys live in `e2e/`.

## TypeScript

- Static data is typed with `satisfies` so literal types survive, and types derive from data (`typeof`, `(typeof x)[number]`) instead of being written twice. Data looked up by a runtime key, like a slug, is annotated with its record type instead: its keys can't be literal types anyway.
- Model variants as discriminated unions or string-literal unions. Use unions, never `enum` or boolean flag pairs.
- `as` and non-null assertions appear only at a trust boundary (a DOM API, a parsed URL), with a one-line comment saying why the value is safe.
- Named exports everywhere, except the default export React Router requires from route modules.
- Parse untrusted input (URL search params) into typed values at the edge; invalid input falls back to a default instead of throwing.

## React

- Function components only. Props are a `Props` interface next to the component.
- Derive values during render. `useEffect` is for synchronising with something outside React (WebGL, observers, listeners), and always cleans up.
- **The URL holds the state worth sharing**, so it can be shared and the back button works. Component state holds only ephemeral UI.

## Styling

- Tailwind utilities with the tokens defined in `app/app.css` `@theme`. Values the design system defines are never hard-coded: use a token, or add one.
- The one exception is the Tapa (`app/tapa/`): it is also rasterized for the 3D cover, outside the page's CSS, so it names its own fonts and computes its own colours, kept in step with `@theme`.
- Inline `style` only for values computed at runtime.

## Accessibility

Non-negotiable, and checked in review even where lint is silent:

- Every Manual is reachable as a real link with a meaningful name, with or without the 3D layer (ADR 0001).
- Everything works by keyboard alone, with a visible focus ring.
- `prefers-reduced-motion` is honoured by every animation, 2D and 3D.
- Text contrast meets WCAG AA. Touch targets are at least 44×44 px.

## Performance budget

A PR that breaks the budget is not done:

- Prerendered HTML shows the content first; the 3D scene arrives after first paint without shifting layout (CLS < 0.1).
- JavaScript needed before first paint, excluding the lazy 3D and PDF chunks: ≤ 120 KB gzip.
- A PDF is fetched only when the visitor asks for it (Hojear or Descargar).
- 3D: 60 fps target on the test device (a mid-range Android phone), under the rules in `book-3d`.

## Testing

- Use the `tdd` skill at the seams named in the ticket.
- Test behaviour, in domain words: `"a Par links each Manual to its other-language twin"`, not `"renders component"`.
- Query the DOM the way a visitor perceives it: by role and accessible name.
- The catalog has integrity tests: unique slugs, every PDF file exists, every Par is symmetric, every Recorrido covers its Coleccion exactly once.
- Every user journey has a Playwright test that runs at phone and desktop width.
- 3D appearance is checked visually through the `verify` skill, never with pixel snapshots.

## Errors

- Every route renders a Spanish error state, never a blank page.
- Any 3D failure (no WebGL, lost context, shader error) falls back to the flat track; a visitor can always reach every Manual.

## Dependencies

A new dependency needs one line in the PR body saying why the platform or an installed package can't do the job.

## Commits

Commit subjects are imperative and reference their issue: `Add catalog integrity tests (#4)`. The PR flow is the definition of done in `AGENTS.md`.
