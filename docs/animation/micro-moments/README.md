# Micro moments

Eleven short animations that confirm a player's action using Hidden Gems' dot language. Josh Titus directed them through comments on a design canvas on Nov 2 2026. The canvas boards are exported here so the repo holds them.

To integrate them, follow [`rundoc.md`](rundoc.md).

## What's here

| Path | Holds |
|---|---|
| `preview/*.html` | One working proof per moment. Open directly in a browser, with no build. |
| `png/*.png` | Four frames from each proof. |
| `moments.md` | What each moment does, its timing and its source. |
| `tokens.css` | The color tokens the proofs assume, including the proposed `--fc-illus-*`. |
| `source/core.js` | The particle engine, as one class. |
| `source/scenes/*.js` | One scene per moment, as methods added to that class. |
| `source/gem-dots.json` | The gem as 163 dots: `[x, y, radius, tone]` in a 100 unit box, tone 0 brightest. |

## How it was built

Each proof is a phone or desktop mock with a full-size canvas on top. On a timer, a scene taps a mock control, changes the DOM and draws dots on the canvas.

The engine's main parts:

- `alloc` is the no-touch rule. On every frame, each dot can only grow as far as its nearest neighbor allows.
- `cloud` draws one group of dots traveling together, moving chaotically inside the group.
- `fly` moves one dot from a point to a point.
- `cascade` and `uncascade` sweep a row away and back.
- `toast` shows the 5 second Undo and counts it down in dots.
- `tk` reads a CSS token into a canvas color, so dots follow the brand tokens.

## How it stands

These are proofs, not production code.

- **Timers drive them.** The app needs real events, including failed ones. Each proof also loops, for review only.
- **Everything is sample data and mock markup.** Copy, numbers and layout come from the mocks, so `docs/wireframes` and the live screens win.
- **Raw values are everywhere.** Hex, px and inline styles all need Facet tokens and classes.
- **Reduced motion is unfinished.** A proof just stops at its starting state. The app must show the end state instead.
- **The canvas resolution is fixed at 2x,** and the size is read once.

Tested in Chromium on Nov 3 2026: every proof ran without errors, and the closest two dots ever came was 1 px.

## Motion rules

Set by Josh. Keep these through any rebuild.

1. Dots never touch.
2. Dots that travel are always brand color, even on a destructive action. Destructive controls use the stop tokens.
3. Removing is instant with a 5 second Undo, and no confirm step. Undo plays the same motion in reverse.
4. Remove motion starts at the control, large dots shrinking to dust.
5. Dots travel as one chaotic cloud, never a grid or single file.
6. Nothing flies to the Slips tab or into a drawer. The tab and drawer answer with an edge glint instead.
7. A selected gem stays in its active state under the drawer tint.
8. Information shows once on a screen.
9. Keep it calm. Josh slowed the big moments down after the first pass.

## Not in this package

The design canvas also holds loading moments (Kit 8), the full send flow (Kit 12) and illustration kits. Those come later as their own packages.
