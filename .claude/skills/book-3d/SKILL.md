---
name: book-3d
description: The 3D craft bar for this project's books. Use when building, tuning or reviewing anything 3D: the book model, its materials or lighting, the Hélice scene, the turnable book on a Manual page, or 3D performance and fallback.
---

# Book 3D

The 3D book is the product's face (ADR 0001), and **a cheap-looking book is worse than no book**. The bar is the floating CDs at a24.raviklaassens.com: plain three.js, every surface finished with micro-detail, studio light drawn in code. Exact values from that site are in [reference/a24.md](reference/a24.md); read it before touching materials, lighting or renderer settings.

The previous concept (a metal filing cabinet) failed in three ways: paper modelled as flat sheets that vanished at some angles, lighting that was off, and interactions that fought the visitor. **Anatomy** fixes the first, **Light** the second, and **Motion** the third.

Use `r3f-best-practices` and `three-best-practices` for general correctness, and Context7 for the API of the installed three / @react-three/fiber / drei / postprocessing versions. This skill holds only what is specific to these books.

## Anatomy

The book is a hardcover, built procedurally in code. No model files.

- **Parts**: two boards, a rounded spine joining them, and the page block, inset from the boards on the three open sides (the *squares*), with a shallow hinge groove where the board meets the spine.
- **Proportions**: A4 page (210 × 297 mm). World unit = 10 cm, so a page is 2.1 × 2.97 units.
- **Thickness comes from the Manual's real page count**, through one function, monotonic in pages. The thinnest Manual (Guía, 14 pages) must still carry a legible Lomo, and the thickest (AED R, 151 pages) must still look like a book, not a brick. Exaggerate paper caliper as needed, and record the tuned constants here.
- **Every surface is solid**: closed geometry, outward normals, no single-sided planes. Board corners and edges carry a small bevel; the spine is smooth-shaded, board corners keep hard edges.
- Geometry is built once per distinct thickness and cached; never rebuilt on render.

## Materials

All `MeshPhysicalMaterial`. Colour textures are sRGB; normal and roughness maps are linear (`NoColorSpace`). Every texture uses max anisotropy.

- **Cover wrap** (front board, spine, back board): the Tapa drawn to a canvas as `map`, under a laminate: `clearcoat` 0.6–0.9 with low `clearcoatRoughness`, base `roughness` driven by a grain map, and a faint normal map of paper tooth, a few fine scratches and sparse dust. The highlight must travel across the cover as it turns, soft and broad: print under film, never plastic, never mirror.
- **Board edges**: the bevel catches a thin bright highlight (slightly lower roughness than the face). This rim is what sells the CDs; it sells the boards too.
- **Page block**: warm off-white, `roughness` around 0.8, no clearcoat, with a normal map of fine lines along the stack so the edge reads as stacked leaves, not a beige box.
- **Lomo**: the spine text is drawn into the texture at least 2× its on-screen size, so it stays crisp on a 3× phone screen.
- Micro-detail maps (grain, tooth, scratches, dust, page lines) are generated procedurally once per session, at most 1024 px (512 px on phones), off the main thread where possible, and shared by every book. Only the Tapa map is per-book.
- Colours come from the `design-system` tokens.

## Light

- **Renderer**: antialias on, Neutral tone mapping at exposure 1 (not A24's ACES: see Tuned values), sRGB output, transparent canvas: the DOM owns the page background.
- **Environment**: a procedural equirect computed in code as float (HDR) data: a dark gradient plus soft softboxes, run through PMREM and set as `scene.environment`. Its softboxes are what the laminate reflects, so tune their position, width and softness for the cover highlight. No HDR files.
- **Lights**: a warm key, a cool rim from behind to separate the silhouette from the background, a soft rectangular strip above, and a sky/floor hemisphere fill.
- **Grounding**: a soft contact shadow under the Manual page's book, drawn analytically from the footprint (one quad). No real-time shadow maps. The Hélice's books float free of gravity (ADR 0003), so they have no shadow; fog in the paper colour sets them in depth instead.

## Motion

- Everything moves on springs, never linear tweens, and every animation is delta-time based.
- **Hélice**: scroll position alone drives the scene (ADR 0003). There is no drag and no orbit control. The focus is the step of the flat track at the centre of the screen, in steps, sprung; each book is placed by its distance from it, so it comes round from behind, faces the visitor in focus, and swings away up the spiral. A tap or click on a book opens its Manual; a modifier or middle click opens a new tab. A link reached by Tab centres its step, which brings its book into focus. Each book is placed as it mounts, so none shows, or takes a tap, where it doesn't belong.
- **The Hélice's entrance and exit** (#70, "rise", from #67): a Colección change is one movement. The whole helix speeds up and away, turning as a scroll would, and the next Colección follows from below at the same speed and settles; the fog closes as it goes, so the swap happens with every book the paper's colour. It is the one motion on eased curves rather than a spring: it is timed, not driven by the visitor, and the two curves meet at equal speed. It plays after a change picked from the Colección filters (exit, then entrance), on Back or Forward between Colecciones (entrance only), and on a first visit as the cover lifts (entrance only). Never on opening a Manual, under reduced motion or without WebGL; a change picked mid-movement takes over from wherever the books are. The state lives in `app/shared/movement.ts`, which the filters can reach without loading three.
- **Book on a Manual page**: a horizontal drag turns it (`touch-action: pan-y`, so vertical scroll stays native) and it settles back on a spring. Desktop adds a hover tilt of at most ~0.2 rad, plus a slow idle sway.
- Under `prefers-reduced-motion` the flat track replaces the 3D Hélice (ADR 0003); the Manual page shows the book still, at its hero pose.

## Performance

Target: 60 fps on a mid-range Android phone. Degrade render resolution, never geometry or material setup; the one exception is micro-detail map size on phones (below), where the detail is sub-pixel anyway.

- Device pixel ratio capped at 2 on desktop and 1.5 on phones, with a total pixel budget.
- drei `PerformanceMonitor` steps resolution down through tiers (1, 0.85, 0.7, 0.55) when frames run slow.
- `frameloop="demand"`: render only while something moves (scroll, spring, drag), then stop. The Manual page's idle sway is the one continuous animation, and it pauses whenever the book is off-screen or the tab is hidden.
- Precompile shaders (`renderer.compileAsync`) before revealing the canvas, then fade it in; nothing pops.
- Only books near the viewport are visible; the rest set `visible = false`. The Hélice mounts only the books within 6 steps of the focus (13 at most), each memoised so a moving focus re-renders none of them; the first view waits for its books before fading in, and a book mounted later loads in a transition, so the scene never blanks.
- The 3D chunk loads after first paint (see `CODING_STANDARDS.md` budget).
- Every imperatively created geometry, material and texture is disposed with its owner.

## Fallback

The flat track (the same Manuales as DOM links to their Tapas, same order) renders when WebGL2 is missing, when the context is lost, when shader compilation fails, and under reduced motion. The prerendered HTML is the flat track; the 3D scene is layered on top once it is ready, so a failure never leaves a blank page.

## Visual review

Every PR that touches 3D runs the `verify` skill with the **pose set** below, at phone and desktop width, and passes every check on every frame before it ships. Verify on the real GPU; a software renderer judges shape only.

Each 3D view supports a dev-only `?pose=<name>` search param that freezes time and places the camera and book in that pose, so screenshots are reproducible. Poses for the single book: `front`, `three-quarter`, `spine`, `top`, `fore-edge`, `back`, `grazing` (camera nearly edge-on to the cover). Poses for the Hélice: `helice-top` (the first book in focus), `helice-middle` (halfway between two books, to judge the movement mid-turn) and `helice-bottom` (the last book in focus).

Checks:

1. **Solid**: no surface vanishes, flickers or shows a back face from any pose.
2. **Rim**: board-edge bevels catch a thin highlight.
3. **Laminate**: the cover highlight is soft, broad and moves between poses; the print under it stays readable.
4. **Paper**: the page block reads as stacked leaves.
5. **Lomo**: spine titles are legible at phone width.
6. **Colour**: Tapa colours match the design tokens; nothing washed out (colour-space error) or crushed.
7. **Clean**: no shimmering edges or spine text, no blurry texture at `grazing`.
8. **Grounded**: the Manual page's book sits on its shadow. In the Hélice the books float by design; the far ones fade into the paper, never cut off by a hard edge.
9. **Bar**: next to a screenshot of the A24 CDs at the same size, the book belongs on that site.

A frame that fails a check is fixed and re-shot. Report the passing frames in the PR.

## Tuned values

Record here the constants the prototype settles on (caliper scale, bevel radius, laminate values, exposure, environment bands), each with one line on why.

- **Thickness** = `26 + 0.15 × pages` mm (`lomoThickness` in `app/tapa/`): about 28 mm for the Guía to 49 mm for AED R. A 297 mm spine spans about 360 px on a phone, and a Lomo title needs about 10 mm of type to read there.

**Gate (2026-11-16, Franco on his phone):** the book itself passes ("looks phenomenal"), so the procedural approach stays and no ADR change is needed. The lighting reads wrong and gets its own ticket: until that lands, the Light values below are provisional.

From the prototype (#7), now the book module (`app/book/`, #13):

- **Case**: one closed sweep of the cross-section (boards, groove, rounded spine) up the page height. Board 2.4 mm, squares 3 mm, spine shell 1.2 mm, spine bulge 6 mm, hinge groove 7 mm wide and 1 mm deep: first values from real hardcovers, untested against alternatives.
- **Edges**: fore-edge fillet 0.6 mm, head and tail bevel 0.6 mm in 4 steps. Below about 2 device pixels a bevel can't carry a highlight, so the caps join the bevels in a separate **rim material** (roughness 0.35, clearcoat 1, clearcoat roughness 0.05, `envMapIntensity` 2): that is what draws the light line along the board edges.
- **Smooth normals stay off the flat faces**: every curve gets an extra point or ring 0.2 mm from its end. Without it, vertex normals tilt the whole cover and its shading drifts.
- **Cover wrap**: one canvas laid out as [back joint | spine | front joint | front board]. The Tapa fills the board 1:1 and the Lomo is drawn rotated at its natural size (letter tops toward the front cover), centred on the spine. 676 px per world unit (about 2050 px tall) on the single book.
- **Laminate**: base roughness 0.6 × grain map (0.7–1), clearcoat 0.75 at roughness 0.2, tooth normal scale 0.15, clearcoat scratch-and-dust normal scale 0.15 with 8 scratches and 120 specks. More read as cracks and stars at phone size.
- **Micro-detail scale**: maps tile in world units through a second UV set (`uv1`). Phones get 512 px maps over half the tile size, so the detail keeps its physical size; at the same tile size they doubled every scratch.
- **Tone mapping: Neutral, exposure 1.** ACES at 0.86 turned the Tapa's cream type grey and shifted its hues, and Neutral keeps authored colour. This is the one deliberate departure from A24.
- **Environment: HDR, not canvas.** A clearcoat reflects about 4 % head-on, so a softbox capped at white never shows. The softboxes are narrow vertical strips of radiance 10–12 at azimuth 20° and 52° (a cover turned by `yaw` reflects about 90° − 2·yaw), so the band sits on the cover in the three-quarter and hero poses and sweeps across with the idle sway. Wide boxes washed the whole cover pale, because a distant softbox lights a flat cover uniformly unless it is only a few degrees wide.
- **Lights**: hemisphere fill 0.6 (sky white, floor `#b8b2a6`), key 0.4, fill 0.3, A24's blue rim 0.75 and top strip 1.9. A flat ambient left the fore-edge grey-khaki, because it faces away from the key and catches mostly the blue rim.
- **Motion**: A24's spring (stiffness 90, damping 12), drag 0.01 rad/px, released books settle on the nearest whole turn, hover tilt 0.2 rad yaw and 0.08 pitch (pitch rocks a standing book on its base), idle sway 0.06 rad.

The Hélice (#43, from the prototype on `30-first-view-prototype`):

- **Placement**: a book `d` steps from the focus sits at angle 0.78·d rad round a vertical axis of radius 4.6, at height −1.7·d, its cover facing out from the axis. Passed books swing away up and to the left; the next ones come round from below on the right.
- **Camera**: at y 1.4, aimed at the book in focus, at the distance where that book is as tall as its flat Tapa. The prototype's fixed 60% of the height, aimed 0.3 below the book, sat off its flat Tapa.
- **Framing**: read from the flat track, which is its one source (`design-system` Flat track): the scene shifts its view by the first Tapa's offset within its step, so the 3D book fades in over its Tapa and the focus ring stays on it. Today that is centred, 2lvh low (1lvh where the screen is wider than 4:5), clear of the Colección filters.
- **Focus spring**: stiffness 50, damping 13 (#59): nearly critically damped, so the helix turns to the slower one-book-per-screen scroll without the overshoot of A24's spring, which stays on the Manual page's book.
- **Fog**: the paper token, from 3 to 13 units beyond the book in focus. Parsed by `oklchFromCss`: the production build minifies the token's lightness to a percentage, which the old parser read as 95.5 and fogged every book toward white on the built site only.
- **Entrance and exit**: offset `o` in units of 9 world units (`TRAVEL`), +1 gone up, −1 waiting below. Exit `o = from + (1 − from)·u³` over 0.6 s; entrance `o = −(1 − u)⁴` over 0.8 s, so the speeds match at the swap (0.6 / 3 = 0.8 / 4). The helix turns −1.3·o rad. The fog closes as |o| goes from 0.55 to 0.95 (smoothstep): near pulls in by 9 units, far by 16. Books more than 98% fogged aren't drawn. `<html data-helice>` names the step ("leaving", "arriving", then "settling" 55% into the entrance). The entrance waits, out of sight, up to 1 s for the next books to mount.
- **Covers ahead**: the next Colección's first 7 covers (REACH + 1, at `HELICE_PX`, so they hit the cover cache) start drawing at the tap on a filter, one after another, and their promises are marked fulfilled so `use()` takes them at once (an unmarked promise suspends for a retry React throttles by 300 ms). Drawn all at once in the exit they dropped frames there (56 fps, a 67 ms frame at 4× throttle); all at once at the tap, under the old menu's sheet (57 fps, 50–67 ms frames); one after another from the tap, none (60 fps, worst frame 17 ms).
- **Cover wrap**: 676 px per unit on desktop, 420 on phones (the book in focus spans about 200 device px per unit on a phone).
- **Frame rate**: 59 fps average, worst frame 33 ms (#59, 100lvh steps), sweeping all 22 books in 3 s with the CPU throttled 4× (M4, `pnpm shots --fps`). Before each book was memoised, every focus change rebound every book's handlers in R3F, and it ran at 37.
- **GPU memory**: up to 13 cover wraps at once, about 8.5 MB each at 420 px per unit with mipmaps (~110 MB on a phone), plus shared detail maps. Not yet measured on a real phone.
