---
name: design-system
description: The visual and verbal system of this site. Use when building or reviewing anything a visitor sees or reads: layout, tokens, typography, colour, the Tapa system, motion, or Spanish UI copy.
---

# Design system

This site is an **archive, not a marketing site**: the Manuales are the product, and every screen exists to show them and get one into the visitor's hands. A first visit (Visita de descubrimiento) should make browsing a pleasure; a return visit (Visita de regreso) should reach a Manual in three taps or fewer on a phone. When those two pull apart, the return visit wins.

## Relation to `design-taste-frontend`

Use its craft checks: **Keyboard and head**, **One system**, **Copy and links**, **Fast**, and the tap-size and no-sideways-scroll checks at 390 and 320. Its page plan does not apply here: the hero-first structure, "one section per screen", the photography rules and the "no scenes outside tech" rule are written for company sites, and la Pila (ADR 0001) replaces all of them.

## Tokens

The single source of truth is `@theme` in `app/app.css`. Colour, type, spacing, radius, easing and duration are tokens there; the 3D scene and the Tapa canvas read the same values. Add a token rather than hard-code a value.

## The Tapa system

One cover design for every Manual, generated from catalog data, used on the 3D cover, the Lomo, the flat Pila and the Manual page.

- **Same grid, same hierarchy** on every Tapa: Colección mark, title, subtitle, a small line-drawn motif, Autor. A Tapa never depends on the PDF's own cover.
- **Colour encodes the Colección**: one colour family each for Estadística desde cero, Ciencia de datos desde cero and Estadística aplicada. Inside Estadística aplicada, each Carrera gets its own colour within the family, grouped by Campo.
- **Every Tapa survives three sizes**: the full cover on a Manual page, the cover in the Pila, and the Lomo, where only the title (and the Recorrido number) must stay legible at phone width.
- **The motif** is a simple line drawing tied to the Manual's subject, drawn in code, in the Tapa's colour family.
- A Par shares one design with a visible R / Python marker.

## Layout

- Mobile first: design at 390, then widen. Nothing scrolls sideways at 320.
- The search and filter bar sits at the top of the Pila and stays reachable while scrolling.
- Descargar is the primary action wherever a Manual is shown in full; Hojear is secondary.

## Motion

- Springs and short eased transitions using the motion tokens; nothing loops forever without a reason.
- Scroll drives la Pila only; DOM content does not fade in on scroll.
- Under `prefers-reduced-motion`, everything rests and nothing stays hidden.

## Voice

UI copy is Argentine Spanish: warm, plain and direct, as the Autor writes ("La estadística no es solo para matemáticos: es para vos").

- Address the visitor with *vos* and its verb forms: *Descargá*, *Elegí*, *Empezá por acá*.
- Use the `GLOSSARY.md` terms in copy: Manual, Colección, Descargar, Hojear. Their listed synonyms (recurso, bajar, leer online) stay out.
- Buttons are a verb and an object: *Descargar manual*, *Hojear*.
- Name the Autor as **Raúl E. Paz Zanini**, with the accent and the initial.
- Describe a Manual by what it teaches and who it is for, in concrete words.
- Every Manual is free and licensed CC BY-NC-SA 4.0. Say so plainly once per page where a Manual is shown.

## Decisions

Record each settled design decision here (typefaces, the colour families, the Lomo layout, the motif style), one line each with its reason, as the work settles it.
