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
- Under it lies the flat track: one step per Manual, each its Tapa as a link, centred, with a mandatory snap and `snap-stop: always` on each step (#79), so every flick comes to rest on the next book, never between two or past one. Headless Chromium can't judge the feel: check it by hand on a trackpad and a phone. Reduced-motion and no-WebGL visitors keep it.
- A Colección's page has no footer: the license line lives in the menu.
- **Header**: the Autor's name as the logo, in Newsreader at a quiet size (base, lg on desktop), linking home, with the menu at the right, in flow on every page but the Hélice pages. There the header is the menu alone, fixed, with tight margins so the books carry the page (4 px from the top, 16 px a side on a phone, 20 px on desktop).
- **The corner** (#79; Franco found the top-left logo too small to be seen and the record beside the book too close to A24's): on the Hélice pages the Autor's name sits in the bottom-left corner, larger (lg on a phone, 3xl on desktop), linking home. On desktop the record of the book in focus sits over it; on a phone the record sits under the filters.
- **The record of the book in focus** (#77): the book the Hélice rests on, as a catalogue record: its title in Newsreader (15 px on a phone, 22 px on desktop, `text-record`), then a hairline table of Paso (Carrera in Estadística aplicada), Herramientas and Páginas, labels in 9.5 px caps tracked 0.14em and muted (`text-label`), values in 12.5 px medium (`text-fact`). Three columns on a phone; rows on desktop, 15rem wide. It names a book only at rest, so it never names one in passing. A region, "Manual en foco", but not a live one: the track's links are the screen-reader path. It loads after first paint.
- **The pencil** (#77): the site's own hand, a graphite underline (`--color-graphite`), uneven but the same every time (seeded), with a lighter second pass. Today it marks the current filter; Franco wants it to become the way the site highlights things about a book (`app/pencil`).
- **The Colección filters** (picked in #75): the three Colecciones always on screen at the top centre of every Hélice page, and only there (not on a Manual or info page); the only way between Colecciones. Each is its short name ("Estadística", "Ciencia de datos", "Estadística aplicada"; the link's accessible name is the full name) in Hanken 13 px medium at −0.02em (`text-filter`), sentence case, never uppercase. The current one is in full ink, underlined in pencil; the others at 65% (Franco picked half, which is 3.1:1 on paper, under AA; 65% is 4.9:1), full ink on hover. Each has 6 px of padding a side (plus 4 px between links on desktop), about 12 px between names on a phone and 16 px on desktop. From `lg` (1024 px) up: on the header's row; below: a row under the header, where at 320 px two names wrap onto two lines. No dot, no colour, no paper gradient behind them.
- **The menu** ("Índice ▾", interim until Franco picks its form; #76): "Índice" in small caps and a small caret at the top right of every page opens a small dropdown hung under it (a native popover), with the pages about the archive and the license line. No Colecciones: the filters carry them.
- **No words beside the book** (#75): the Tapa already carries the Colección, the number, the title and the Herramientas, and the current filter names the Colección. The "Rótulo" words of #67 are gone; the record (#79) names the book only at rest, away from it.
- **Grain** (#77): one fixed layer of paper grain over the whole page, the 3D included, at 22% (warm dark specks and light specks from one noise, so the paper's tone holds). Taps pass through it. CSS only (`.grain` in app.css).
- **Pages about the archive**: Sobre el Autor (`/autor`), Sobre el archivo (`/archivo`, the license and where to begin) and Contacto (`/contacto`), short running text in the Manual page's column, with the header. Their copy is a placeholder until the Autor's text arrives.
- Descargar is the primary action wherever a Manual is shown in full; Hojear is secondary.

## Motion

- Springs and short eased transitions using the motion tokens. The only continuous animation is the idle sway of the book on a Manual page (`book-3d`).
- **The filters**: they rise in (`animate-rise-in`) one after another as the page loads (not on a Colección change: they stay mounted), at 300 ms + 70 ms each. A hover (on devices that hover) turns a name: it slides up out of its line and back in from below over 0.55 s, leaving on `--ease-leave` and settling on `--ease-settle` (`animate-turn`); a tap doesn't turn it. A press scales the link to 0.95 and lets it spring back over 0.5 s (`--ease-spring`, about 6% overshoot). The pencil draws on under the new name (0.5 s, `--ease-draw`, 0.1 s late; the second pass 0.45 s after) and rubs out under the old one with a 0.25 s fade, marked on the tap, not when the URL catches up about 0.6 s later. It also draws on as the page arrives.
- **The record**: it shows once the scroll has been still for 140 ms on a step. Its title types in, 12 ms a letter (`animate-type`), its hairlines draw in one after another (`animate-draw-in`, 0.15 s + 80 ms a row), and each row's words rise in (0.3 s + 80 ms a row). It fades (0.25 s) as soon as the scroll moves, and hides from a Colección change's start until the new book settles. Under reduced motion it shows and hides at once, with nothing typed or drawn.
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
- **Flat track**: each step is a whole screen tall (100lvh), so one flick moves about one book and the first and last Tapas centre without padding (#59; it was 62lvh, which sent several books past per flick); its Tapa is 50lvh wide (70lvh tall), capped at 84vw on a phone (#79, "mayor"; it was 40lvh and 72vw); the whole Tapa is the link, so it is always far past 44 px. From `lg` up the link is centred, 1lvh low to clear the filters. Below `lg` it fits and centres in the band between the record above (11rem from the top) and the logo below (4rem): 3.5rem low, and at most (100lvh − 15rem) / 1.4 wide. The 3D Hélice frames its book in focus there (book-3d Tuned values).
- **Engravings** (`app/tapa/engravings.json`, masks in `public/engravings/`): public-domain or CC0 plates from Wikimedia Commons, credited, cleaned by `scripts/engravings.py` into a luminance mask (ink white, paper black) that lets the Tapa's ink through; a Par shares its plate. The 3D cover inlines the mask, because a rasterized SVG can't load URLs.
- **First-visit cover** (#32, Franco): on a first visit to a Colección's page in a browser session (sessionStorage, so per tab), a paper cover with the Autor's name counts the 3D Hélice's real work and lifts once it has faded in, on the first keyboard focus, or at a 6 s cap. Never under reduced motion, without WebGL2 or without JavaScript, and never on a Manual page, so a Visita de regreso through a shared link is never slowed; the cap keeps a slow 3D from holding the page back.
