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
- Each Colección is its own Hélice on its own page (ADR 0003): the home page is Estadística desde cero, and `/colecciones/<id>` holds Ciencia de datos desde cero and Estadística aplicada. A page is that Hélice alone: no search. A visitor scrolls the series to find a Manual, in catalog order, and moves between Colecciones with the filters at the top; Back returns to the Colección they came from.
- Under it lies the flat track: one step per Manual, each its Tapa as a link, centred and snapping softly (`proximity`), so a step is always in focus when the scroll stops. Reduced-motion and no-WebGL visitors keep it.
- A Colección's page has no footer: the license line lives in the menu.
- **Header**: the Autor's name as the logo, in Newsreader at a quiet size (base, lg on desktop), linking home, with the menu at the right; fixed over the Hélice on every Colección's page, with tight margins so the books carry the page (4 px from the top, 16 px a side on a phone, 20 px on desktop), and in flow on every other page.
- **The Colección filters** (picked in #75): the three Colecciones always on screen at the top centre of every Hélice page, and only there (not on a Manual or info page); the only way between Colecciones. Each is its short name ("Estadística", "Ciencia de datos", "Estadística aplicada"; the link's accessible name is the full name) in Hanken 13 px medium at −0.02em, sentence case, never uppercase. The current one is in full ink with a 1 px ink underline the width of its name; the others are at half opacity, full ink on hover. Each has 6 px of padding a side (plus 4 px between links on desktop), about 12 px between names on a phone and 16 px on desktop. Desktop: on the header's row; phone: a row under the header, where at 320 px two names wrap onto two lines. No dot, no colour, no paper gradient behind them.
- **The menu** ("Índice ▾", interim until Franco picks its form; #76): "Índice" in small caps and a small caret at the top right of every page opens a small dropdown hung under it (a native popover), with the pages about the archive and the license line. No Colecciones: the filters carry them.
- **No words beside the book** (#75): the Tapa already carries the Colección, the number, the title and the Herramientas, and the current filter names the Colección. The "Rótulo" words of #67 are gone.
- **Pages about the archive**: Sobre el Autor (`/autor`), Sobre el archivo (`/archivo`, the license and where to begin) and Contacto (`/contacto`), short running text in the Manual page's column, with the header. Their copy is a placeholder until the Autor's text arrives.
- Descargar is the primary action wherever a Manual is shown in full; Hojear is secondary.

## Motion

- Springs and short eased transitions using the motion tokens. The only continuous animation is the idle sway of the book on a Manual page (`book-3d`).
- **The filters**: they rise in (`animate-rise-in`) one after another as a Colección's page opens, at 300 ms + 70 ms each. A hover (on devices that hover) turns a name: it slides up out of its line and back in from below over 0.55 s, leaving on `--ease-leave` and settling on `--ease-settle` (`animate-turn`); a tap doesn't turn it. A press scales the link to 0.95 and lets it spring back over 0.5 s (`--ease-spring`, about 6% overshoot). The underline wipes out to the right under the old name (0.45 s, `--ease-leave`) and draws in from the left under the new one (0.6 s, `--ease-settle`, 0.15 s late), marked on the tap, not when the URL catches up about 0.6 s later.
- Scroll drives the Hélice only; DOM content does not fade in on scroll.
- **A Colección change** (#70): a tap on a filter starts it at once. The books rise away, the next Colección's rise in and settle on its first book (book-3d Motion), about 1.4 s in all. Back and Forward play the entrance alone; a first visit's entrance plays as the cover lifts.
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
- **Flat track**: each step is a whole screen tall (100lvh), so one flick moves about one book and the first and last Tapas centre without padding (#59; it was 62lvh, which sent several books past per flick); its Tapa is 40lvh wide (56lvh tall), capped at 72vw on a phone; the whole Tapa is the link, so it is always far past 44 px. The link is centred on every screen (#76; it sat right of centre beside the words before), a touch low to clear the filters: 2lvh down, 1lvh where the screen is wider than 4:5. The 3D Hélice frames its book in focus there (book-3d Tuned values).
- **Engravings** (`app/tapa/engravings.json`, masks in `public/engravings/`): public-domain or CC0 plates from Wikimedia Commons, credited, cleaned by `scripts/engravings.py` into a luminance mask (ink white, paper black) that lets the Tapa's ink through; a Par shares its plate. The 3D cover inlines the mask, because a rasterized SVG can't load URLs.
- **First-visit cover** (#32, Franco): on a first visit to a Colección's page in a browser session (sessionStorage, so per tab), a paper cover with the Autor's name counts the 3D Hélice's real work and lifts once it has faded in, on the first keyboard focus, or at a 6 s cap. Never under reduced motion, without WebGL2 or without JavaScript, and never on a Manual page, so a Visita de regreso through a shared link is never slowed; the cap keeps a slow 3D from holding the page back.
