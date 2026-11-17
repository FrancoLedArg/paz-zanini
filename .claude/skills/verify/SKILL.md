---
name: verify
description: Prove a change works in the real site before review. Use after implementing any ticket, before code-review and the PR, or when asked to check, screenshot or run the site.
---

# Verify

Tests passing is not verification. A change is verified when you have **seen** it working at phone and desktop width, and recorded the evidence.

## 1. Gates

Run `pnpm check`, then `pnpm test:e2e`. Both pass before going on.

## 2. Pick the frames

List every route the change touches, then add search params for each state worth seeing (a filter applied, a search with no results, the reader open). For a change touching 3D, add the `book-3d` **pose set** (`?pose=<name>`) for every 3D view it touches.

## 3. Shoot

Start the dev server in the background (`pnpm dev --port 5173`), then:

```
pnpm shots --out <scratchpad>/shots [--fps] <path> [<path> ...]
```

- `--out` is required: point it at your scratchpad, never the repo.
- Add `--fps` when the change touches 3D or scroll: it scrolls each path on the phone viewport with the CPU throttled 4× and prints the frame rate.
- The script exits non-zero on any console error. Fix the cause, then re-shoot.
- It prints the WebGL renderer. A software renderer (SwiftShader, llvmpipe) judges shape and layout only; say so in the report and leave materials and lighting unjudged.

Stop the dev server when done.

## 4. Look

Open **every** PNG with the Read tool. Check each one against:

- **Layout**: nothing scrolls sideways or overlaps at 390; text is legible; touch targets look at least 44 px; the 1440 frame uses its width.
- **The ticket**: what the issue asked for is visibly there.
- **Design**: the `design-system` rules, including voice for any visible copy.
- **3D**: every `book-3d` visual-review check, on every pose frame.
- **Frame rate** (with `--fps`): average at or near 60 and no frame over ~50 ms on the throttled phone. Below that, apply the `book-3d` performance rules and re-measure.

A frame that fails is fixed and re-shot. This step is done only when every frame passes.

## 5. Report

Add a **Verification** section to the PR body:

- the gates run and their result;
- every frame shot (path, width, pose), each marked passed;
- the WebGL renderer and the frame-rate lines, when relevant;
- anything not verified, and why.

The PNGs stay in the scratchpad; give their absolute paths so the reviewer can open them.
