# The archive is a helix of books driven by scroll position

This supersedes the stack in ADR 0001; its rules stand. The home page shows every Manual as a 3D book floating free of gravity along a helix (the Hélice), and the page's own vertical scroll turns and lowers it. Each book comes round from behind, reaches the front big and facing the visitor, then swings away and down while the next one comes round, so there is one protagonist at every moment and the series stays visible around it. The stack failed as a showcase: its books could only move the way a real pile allows, any moment that singled out one book fought the stack, and on a phone its Lomos read at about 11 px.

## Considered Options

All were prototyped on the branch `30-first-view-prototype` and rejected:

- **A shelf**: the transition from book to book was awkward.
- **One book per screen**: no continuity, so each change was a jump cut.
- **A rolodex**: the series hid behind the front book.
- **A tunnel**: busy mid-transition.

## Consequences

- Still in force from ADR 0001: scroll position alone drives the scene, with no hijacking and no drag or orbit; every book is a real link in the DOM; the 3D loads after first paint; and the flat version is the fallback.
- The flat version is now a track of Tapas, one step per Manual, which snaps softly. It is the prerendered page and the source of truth that the 3D Hélice follows.
