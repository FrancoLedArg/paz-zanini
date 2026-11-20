---
name: design-system
description: The visual and verbal system of this site. Use when building or reviewing anything a visitor sees or reads: layout, tokens, typography, colour, the Tapa system, motion, or Spanish UI copy.
---

# Design system

This site is an **archive, not a marketing site**: the Manuales are the product, and every screen exists to show them and get one into the visitor's hands. A first visit (Visita de descubrimiento) should make browsing a pleasure; a return visit (Visita de regreso) should reach a Manual by scrolling the Hélice. When those two pull apart, the return visit wins.

## Relation to `design-taste-frontend`

Use its craft checks: **Keyboard and head**, **One system**, **Copy and links**, **Fast**, and the tap-size and no-sideways-scroll checks at 390 and 320. Its page plan does not apply here: the hero-first structure, "one section per screen", the photography rules and the "no scenes outside tech" rule are written for company sites, and the Hélice (ADR 0003) replaces all of them.

## Tokens

The single source of truth is `@theme` in `app/app.css`. Colour, type, spacing, radius, easing and duration are tokens there, and the 3D scene reads the same values. Add a token rather than hard-code a value. The Tapa is the exception (see Decisions).

## The Tapa system

One cover design for every Manual, generated from catalog data, used on the 3D cover, the Lomo, the flat track and the Manual page.

- **Same grid, same hierarchy** on every Tapa: Colección mark, a public-domain engraving with its caption, title, Autor. The subtitle lives on the Manual page, where it has room. A Tapa never depends on the PDF's own cover.
- **Colour encodes the Colección**: one colour family each for Estadística desde cero, Ciencia de datos desde cero and Estadística aplicada. Inside Estadística aplicada, each Carrera gets its own colour within the family, grouped by Campo.
- **Every Tapa survives three sizes**: the full cover on a Manual page, a neighbour's cover in the Hélice, and the Lomo, where only the title (and the Recorrido number) must stay legible at phone width.
- **The engraving** is one memorable emblem per Manual, an instrument, machine or document from the field's history, printed in the Tapa's ink. Never a chart or a formula: those read as a generic maths cover.
- A Par shares one design; its language sits in a pill in the footer, so the twins read apart.

## Layout

- Mobile first: design at 390, then widen. Nothing scrolls sideways at 320.
- Each Colección is its own Hélice on its own page (ADR 0003): the home page is Estadística desde cero, and `/colecciones/<id>` holds Ciencia de datos desde cero and Estadística aplicada. A page is that Hélice alone: no search. A visitor scrolls the series to find a Manual, in catalog order, and moves between Colecciones from the menu; Back returns to the Colección they came from.
- Under it lies the flat track: one step per Manual, each its Tapa as a link, centred and snapping softly (`proximity`), so a step is always in focus when the scroll stops. Reduced-motion and no-WebGL visitors keep it.
- A Colección's page has no footer: the license line lives in the menu.
- **Header**: the Autor's name as the logo, in Newsreader at a quiet size (base, lg on desktop), linking home; fixed over the Hélice on every Colección's page, in flow on every other page, with the menu at the right.
- **The menu** ("Índice", picked in #58): "Índice" in small caps and a short rule at the top right of every page opens a full-screen index over the paper, a native modal dialog. It holds the Colecciones (I–III, in Newsreader with their counts, each linking its page; the current one is ink and says "Estás acá"), the pages about the archive, and the license line at its foot. It is everything that isn't a book, so the books keep the stage.
- **The words of the book in focus** ("Rótulo", picked in #67): a running head with the Colección's numeral and name in small caps ("I · Estadística desde cero"), always on screen; the number (Recorrido step, or place in its Colección) in the Tapa colour, as an odometer, with the Colección's count after it ("/ 06"); the title in Newsreader as a link; and one line of details (Recorrido step or Carrera, Herramientas, page count). They are small, so the book stays the loudest thing on screen (head and details xs, number 4xl/5xl, title xl/2xl). They sit in the bottom-left corner when the screen is wider than 4:5 (the `wide` variant, where the Hélice frames its book right of centre), and at the bottom under the book otherwise: there they stick to the bottom of the screen until the track ends, then leave with it, over paper until the 3D has faded in. They are not a live region: the track's links are the screen-reader path, and the odometer is hidden from it (the details name the step).
- **Pages about the archive**: Sobre el Autor (`/autor`), Sobre el archivo (`/archivo`, the license and where to begin) and Contacto (`/contacto`), short running text in the Manual page's column, with the header. Their copy is a placeholder until the Autor's text arrives.
- Descargar is the primary action wherever a Manual is shown in full; Hojear is secondary.

## Motion

- Springs and short eased transitions using the motion tokens. The menu unrolls from the top over 0.75 s, its rows rising in one after another as their rules draw in, and rolls back up over 0.45 s. The only continuous animation is the idle sway of the book on a Manual page (`book-3d`).
- Scroll drives the Hélice only; DOM content does not fade in on scroll. The one exception is the words of the book in focus, which follow the scroll on every frame, with no rest timer (#69; Franco found the 180 ms rest "clunky"). The number is an odometer: every book's number in one column (1.3em apart in a 1em window, so a resting number has clean paper under it), rolled by the scroll, so a flick shows numbers rolling and never names a book before it arrives. The title and details follow `--near` (1 on a step, 0 at 0.22 of a step or more away, smoothstep): the title comes up out of a blur (opacity, a 0.6 rem rise, up to 5 px blur) and, away from its book, is inert. The running head rises in (`animate-rise-in`) when a Colección's page opens. Under reduced motion the number jumps to the nearest step and the title stays, naming the nearest book.
- Under `prefers-reduced-motion`, everything rests and nothing stays hidden.

## Voice

UI copy is Argentine Spanish: warm, plain and direct, as the Autor writes ("La estadística no es solo para matemáticos: es para vos").

- Running copy addresses the visitor with *vos* and its verb forms: *Elegí tu carrera*, *Empezá por acá*.
- Use the `GLOSSARY.md` terms in copy: Manual, Colección, Descargar, Hojear. Their listed synonyms (recurso, bajar, leer online) stay out.
- Buttons and links name the action in the infinitive, matching the glossary: *Descargar manual*, *Hojear*.
- Name the Autor as **Raúl E. Paz Zanini**, with the accent and the initial.
- Describe a Manual by what it teaches and who it is for, in concrete words.
- Every Manual is free and licensed CC BY-NC-SA 4.0. Say so plainly once per page where a Manual is shown.

## Decisions

Record each settled design decision here, one line each with its reason.

- **Typefaces**: Newsreader (titles, Tapas, Lomos) in its display cut (`"opsz" 72`, about weight 400–420), except the Lomo title, which keeps the sturdier text cut at weight 500 to stay readable at 10 mm, and Hanken Grotesk (labels, UI): the Editorial pairing, premium and academic, shared by the site and the Tapas so they read as one system. Only Newsreader's upright optical-size file loads (no italic file: the site sets no italics). Both self-hosted via Fontsource so Tapas can embed them when rasterized.
- **Tapa is SVG, one source** (`app/tapa/`): crisp in the DOM, rasterized for the 3D cover. It names its fonts and resolves its colours to hex itself, because a rasterized SVG can't read page CSS; keep those in step with `@theme`.
- **Colour families** (OKLCH): Estadística desde cero blue (hue 252), Ciencia de datos desde cero green (168), Estadística aplicada warm, by Campo: Salud wine (8), Tecnología bronze (66), Ciencias Sociales rust (40). The Recorrido step darkens the shade; Carreras within a Campo step down in lightness and turn slightly in hue, so neighbours stay distinct. The shade fills the title band; the engraving, caption and labels on the cream field print in its ink, 0.06 darker.
- **Cream type on every band, ink type on every cream field**, both enforced at WCAG AA by a test, so a new shade can't ship unreadable.
- **Designed titles and Lomo titles** per Manual (`app/tapa/designs.ts`): a kicker ("Estadística aplicada a la"), the main lines broken by hand like a book designer would, and the tail "desde cero"; a test keeps the parts equal to the catalog title.
- **Tapa layout** ("Grabado"; the millimetres live in `app/tapa/tapa.tsx`): a cream field over a colour band, so the picture sits apart from the words. The field carries the Colección and the Recorrido number ("N.º 01") or Campo in small caps, the engraving, and a one-line caption; a faint grain makes it read as printed stock. The band carries the title in cream, left-aligned on one fixed first baseline, with the kicker above and "desde cero" after it in soft cream; four lines step the title down a size. A hairline, then the Autor in Newsreader and the Herramientas in small caps ("Sin software" when there are none); a Par puts its language in a pill. No italics, no subtitle: at a neighbour's size in the Hélice a subtitle would be illegible noise, and the Manual page shows it in full.
- **Lomo layout**: Recorrido number, short title in Newsreader at 10 mm, Herramientas at the right (both labels in Hanken small caps), thin rules near both edges. 10 mm is about 12 px on a 390 px phone, the smallest size a spine title stays readable at.
- **Flat track**: each step is a whole screen tall (100lvh), so one flick moves about one book and the first and last Tapas centre without padding (#59; it was 62lvh, which sent several books past per flick); its Tapa is 40lvh wide (56lvh tall), capped at 72vw on a phone; the whole Tapa is the link, so it is always far past 44 px. The link sits 10vw right of centre, or 13lvh above it at an aspect of 4:5 or narrower, where the 3D Hélice frames its book in focus (book-3d Tuned values).
- **Engravings** (`app/tapa/engravings.json`, masks in `public/engravings/`): public-domain or CC0 plates from Wikimedia Commons, credited, cleaned by `scripts/engravings.py` into a luminance mask (ink white, paper black) that lets the Tapa's ink through; a Par shares its plate. The 3D cover inlines the mask, because a rasterized SVG can't load URLs.
- **First-visit cover** (#32, Franco): on a first visit to a Colección's page in a browser session (sessionStorage, so per tab), a paper cover with the Autor's name counts the 3D Hélice's real work and lifts once it has faded in, on the first keyboard focus, or at a 6 s cap. Never under reduced motion, without WebGL2 or without JavaScript, and never on a Manual page, so a Visita de regreso through a shared link is never slowed; the cap keeps a slow 3D from holding the page back.
