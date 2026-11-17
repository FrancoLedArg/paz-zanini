# The archive is a 3D stack of books driven by scroll position

The home page shows every Manual as a 3D book lying flat in one tall stack ("la pila"), and the visitor moves through it with the page's own vertical scroll. A previous 3D concept (a metal filing cabinet with folders) pleased the Autor but failed in use: the paper read as flat sheets that vanished at some angles, the lighting was off, and the interactions were hard, especially on phones. We keep 3D because the Autor values it, and we pick a stack because books lying flat show their spines with horizontal text, so the stack reads as a list on a phone.

## Considered Options

- **Shelf of upright books**: rejected; vertical spine text and sideways swipes per shelf conflict with vertical page scroll on mobile.
- **Books on a table, explored by dragging the camera**: rejected; camera drag fights touch scrolling, which is what sank the filing cabinet.
- **Flat 2D catalog**: rejected; the Autor explicitly wants 3D.

## Consequences

- No scroll hijacking, no drag or orbit controls in the Pila: scroll position alone drives the scene. Desktop smooth scrolling (Lenis) is allowed because it still follows scroll position; touch devices keep native scroll.
- The one exception is a single book on a Manual's own page: it may be turned by a horizontal drag only, so vertical scrolling keeps working.
- Every book is also a real link in the DOM, so keyboard, screen readers and search engines work without the 3D layer.
- The 3D layer loads after first paint; with reduced motion or no WebGL, the same stack renders as flat books.
- Quality is a hard gate: a 3D book that looks cheap defeats the purpose, so the book is proven in a prototype on a real phone before the site is built around it.
