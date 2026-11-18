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

- **Same grid, same hierarchy** on every Tapa: Colección mark, title, a line-drawn motif inside the margins, Autor. The subtitle lives on the Manual page, where it has room. A Tapa never depends on the PDF's own cover.
- **Colour encodes the Colección**: one colour family each for Estadística desde cero, Ciencia de datos desde cero and Estadística aplicada. Inside Estadística aplicada, each Carrera gets its own colour within the family, grouped by Campo.
- **Every Tapa survives three sizes**: the full cover on a Manual page, a neighbour's cover in the Hélice, and the Lomo, where only the title (and the Recorrido number) must stay legible at phone width.
- **The motif** is a simple line drawing tied to the Manual's subject, drawn in code, in the Tapa's colour family.
- A Par shares one design; its language sits in a pill in the footer, so the twins read apart.

## Layout

- Mobile first: design at 390, then widen. Nothing scrolls sideways at 320.
- The home page is the Hélice alone: no search or filters. A visitor scrolls the series to find a Manual, in catalog order.
- Under it lies the flat track: one step per Manual, each its Tapa as a link, centred and snapping softly (`proximity`), so a step is always in focus when the scroll stops. Reduced-motion and no-WebGL visitors keep it.
- The license line ends the track, after the last Manual: the home page has no footer.
- Descargar is the primary action wherever a Manual is shown in full; Hojear is secondary.

## Motion

- Springs and short eased transitions using the motion tokens. The only continuous animation is the idle sway of the book on a Manual page (`book-3d`).
- Scroll drives the Hélice only; DOM content does not fade in on scroll.
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

- **Typefaces**: Fraunces (titles, Tapas, Lomos) for a book-cover voice, weight axis only (its optical-size file costs 30 KB more per page for no visible gain); Instrument Sans (labels, UI) for small sizes. Both self-hosted via Fontsource so Tapas can embed them when rasterized.
- **Tapa is SVG, one source** (`app/tapa/`): crisp in the DOM, rasterized for the 3D cover. It names its fonts and resolves its colours to hex itself, because a rasterized SVG can't read page CSS; keep those in step with `@theme`.
- **Colour families** (OKLCH): Estadística desde cero blue (hue 252), Ciencia de datos desde cero green (168), Estadística aplicada warm, by Campo: Salud wine (8), Tecnología bronze (66), Ciencias Sociales rust (40). The Recorrido step darkens the shade; Carreras within a Campo step down in lightness and turn slightly in hue, so neighbours stay distinct.
- **Cream type on every Tapa**, enforced at WCAG AA by a test, so a new shade can't ship unreadable.
- **Designed title lines and Lomo titles** per Manual (`app/tapa/designs.ts`), broken by hand like a book designer would; a test keeps the lines equal to the catalog title.
- **Tapa layout**: Colección label and Recorrido number (or Campo) over a rule, title in Fraunces, the motif scaled into the space between title and footer, Autor and Herramientas in the footer. No subtitle: at a neighbour's size in the Hélice it would be illegible noise, and the Manual page shows it in full.
- **Lomo layout**: Recorrido number, short title in Fraunces at 10 mm, Herramientas at the right, thin rules near both edges. 10 mm is about 12 px on a 390 px phone, the smallest size a spine title stays readable at.
- **Flat track**: each step is 62lvh with its Tapa 40lvh wide (56lvh tall), capped at 72vw on a phone, and 19lvh of room at both ends lets the first and last Tapas centre; the whole Tapa is the link, so it is always far past 44 px The link sits 10vw right of centre, or 13lvh above it at an aspect of 4:5 or narrower, where the 3D Hélice frames its book in focus (book-3d Tuned values).
- **Motifs**: thin-line drawings of each subject in a lighter tint of the Tapa colour, with one soft fill; a Par shares its motif.
