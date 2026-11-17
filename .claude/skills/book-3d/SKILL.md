---
name: book-3d
description: The 3D craft bar for this project's books. Use when building, tuning or reviewing anything 3D: the book model, its materials or lighting, the Pila scene, the turnable book on a Manual page, or 3D performance and fallback.
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

- **Renderer**: antialias on, ACES Filmic tone mapping starting at exposure ~0.86, sRGB output, transparent canvas: the DOM owns the page background.
- **Environment**: a procedural equirect drawn on a canvas (gradient plus soft white bands, like studio softboxes), run through PMREM and set as `scene.environment`. Its bands are what the laminate reflects, so tune their height and softness for the cover highlight. No HDR files.
- **Lights**: a warm key, a cool rim from behind to separate the silhouette from the background, a soft rectangular strip above, and a low ambient.
- **Grounding**: a soft contact shadow under the Pila and under the single book, rendered once while the scene is static. No real-time shadow maps.

## Motion

- Everything moves on springs, never linear tweens, and every animation is delta-time based.
- **Pila**: scroll position alone drives the scene (ADR 0001). The book nearest the viewport centre lifts and turns slightly toward the visitor. There is no drag and no orbit control.
- **Book on a Manual page**: a horizontal drag turns it (`touch-action: pan-y`, so vertical scroll stays native) and it settles back on a spring. Desktop adds a hover tilt of at most ~0.2 rad, plus a slow idle sway.
- Under `prefers-reduced-motion` the flat Pila replaces the 3D one (ADR 0001); the Manual page shows the book still, at its hero pose.

## Performance

Target: 60 fps on a mid-range Android phone. Degrade render resolution, never geometry or material setup; the one exception is micro-detail map size on phones (below), where the detail is sub-pixel anyway.

- Device pixel ratio capped at 2 on desktop and 1.5 on phones, with a total pixel budget.
- drei `PerformanceMonitor` steps resolution down through tiers (1, 0.85, 0.7, 0.55) when frames run slow.
- `frameloop="demand"`: render only while something moves (scroll, spring, drag), then stop. The Manual page's idle sway is the one continuous animation, and it pauses whenever the book is off-screen or the tab is hidden.
- Precompile shaders (`renderer.compileAsync`) before revealing the canvas, then fade it in; nothing pops.
- Only books near the viewport are visible; the rest set `visible = false`.
- The 3D chunk loads after first paint (see `CODING_STANDARDS.md` budget).
- Every imperatively created geometry, material and texture is disposed with its owner.

## Fallback

The flat Pila (the same books as DOM elements, same order, same links) renders when WebGL2 is missing, when the context is lost, when shader compilation fails, and under reduced motion. The prerendered HTML is the flat Pila; the 3D scene is layered on top once it is ready, so a failure never leaves a blank page.

## Visual review

Every PR that touches 3D runs the `verify` skill with the **pose set** below, at phone and desktop width, and passes every check on every frame before it ships. Verify on the real GPU; a software renderer judges shape only.

Each 3D view supports a dev-only `?pose=<name>` search param that freezes time and places the camera and book in that pose, so screenshots are reproducible. Poses for the single book: `front`, `three-quarter`, `spine`, `top`, `fore-edge`, `back`, `grazing` (camera nearly edge-on to the cover). Poses for the Pila: `pila-top`, `pila-middle`, `pila-bottom`.

Checks:

1. **Solid**: no surface vanishes, flickers or shows a back face from any pose.
2. **Rim**: board-edge bevels catch a thin highlight.
3. **Laminate**: the cover highlight is soft, broad and moves between poses; the print under it stays readable.
4. **Paper**: the page block reads as stacked leaves.
5. **Lomo**: spine titles are legible at phone width.
6. **Colour**: Tapa colours match the design tokens; nothing washed out (colour-space error) or crushed.
7. **Clean**: no shimmering edges or spine text, no blurry texture at `grazing`.
8. **Grounded**: every book sits on its shadow; nothing floats.
9. **Bar**: next to a screenshot of the A24 CDs at the same size, the book belongs on that site.

A frame that fails a check is fixed and re-shot. Report the passing frames in the PR.

## Tuned values

Record here the constants the prototype settles on (caliper scale, bevel radius, laminate values, exposure, environment bands), each with one line on why.

- **Thickness** = `26 + 0.15 × pages` mm (`lomoThickness` in `app/tapa/`): about 28 mm for the Guía to 49 mm for AED R. A 297 mm spine spans about 360 px on a phone, and a Lomo title needs about 10 mm of type to read there.
