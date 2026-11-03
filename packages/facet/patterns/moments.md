# Moments

Short dot animations that confirm what a reader just did, in the product's dot language. Josh Titus directed them on
Nov 2 2026; the proofs, their timings and the original direction live in `docs/animation/micro-moments/`. This page is
the rulebook for building them.

## Motion rules

Set by the principal. They hold through any rebuild.

1. Dots never touch, on any frame.
2. Dots that travel are always brand tones, even on a destructive action. Destructive controls use the stop tokens.
3. Removing is instant with a 5 second Undo and no confirm step. Undo plays the same motion in reverse.
4. Remove motion starts at the control: large dots shrinking to dust.
5. Dots travel as one chaotic cloud, never a grid or single file.
6. Nothing flies to the Slips tab or into a drawer. The tab and the drawer answer with an edge glint instead.
7. A selected gem stays in its active state under the drawer tint.
8. Information shows once on a screen.
9. Keep it calm. The big moments were slowed down after the first pass.

Rules 1 and 2 are enforced by the engine (`alloc`, and travelling dots accept only `--fc-illus-1` to `4`), so callers
cannot break them.

## Build requirements

- **State first.** Data and the DOM change at once; the animation follows. A failed or skipped animation never blocks
  the action. A moment may hold the server's answer on screen until its dots have passed (under a second), so no cloud
  is left drawing over content that has moved.
- **A failed action reverses.** Put the state back, play the motion backward and say what happened in the live region.
- **Reduced motion.** Every primitive draws nothing and resolves at once, so the caller shows the end state. No loops:
  the sheen and the orbit do not run, and a staggered change happens at once.
- **Accessibility.** The canvas is `aria-hidden` and never takes pointer events. Changes are announced in words (a
  count, a toast, the live region). Undo is keyboard reachable and holds its time while hovered or focused. Color is
  never the only cue.
- **Performance.** One canvas per stage, sized to the device pixel ratio and resized by a ResizeObserver. The frame
  loop runs only while something plays and pauses while the tab is hidden; an orbit stops drawing while its element is
  off screen. Clean up on unmount (`destroy()`).
- **No layout shift.** Motion never moves layout. Rows close smoothly; tables stay stable.

## The parts

| Part | Where | What it does |
|---|---|---|
| Dots engine | `js/dots.mjs` (types in `js/dots.d.mts`) | Stages and primitives, framework-free, no dependency |
| Tones | `--fc-illus-1` to `4`, `--fc-illus-context-1` to `4` | Brand ramp built from `--fc-brand-*`, and a gray ramp for still context dots |
| Motion tokens | `--fc-ease-emphasized`, `--fc-ease-exit`, `--fc-duration-sheet`, `--fc-duration-undo` | The sheet's spring open and plain close, and the Undo time |
| Stage layer | `.fc-stage`, `--fc-z-stage` | Fixed over the viewport, above sheets and menus, below toasts |
| Gem card states | `.fc-gem-card[data-unread]`, `[data-selected]` | Unread tint and sheen; selected brand edge (`components/gem-card.md`) |
| Undo toast | `.fc-toast`, `.fc-toast-dots`, `js/undo.mjs` | Five dots count 5 seconds down (`components/toast.md`) |
| Edge glint hooks | `--fc-glint-edge`, `[data-glint]` | Which edge to ripple on the tab bar, rail items and the sheet |

## The engine

```js
import { createStage } from '@foundingcreative/facet/js/dots.mjs';
const stage = createStage();           // fixed, full viewport, on document.body
await stage.sweep(row, { from: closeButton, wipe: true });
```

| Export | Does |
|---|---|
| `createStage(host?, { cover, outset })` | One canvas. No host: fixed over the viewport. With a host: over the host (`cover: 'host'`), or over the viewport from inside it (`cover: 'viewport'`, for a modal `<dialog>` in the top layer). `outset` grows a host canvas past its edges |
| `stage.cloud({ from, to, duration, count, size, spread, opacity, arc, absorb, tones, clip, delay, signal })` | One cloud of dots travelling together, chaotic inside the group |
| `stage.fly(dot, { to, duration, size, opacity, arc, ease, clip, delay, signal })` | One dot from a point to a point |
| `stage.dust(dots, { clip, signal })` | Dots drift, shrink and fade to nothing |
| `stage.sweep(el, { from, wipe, ...cloud })` | A cloud across an element from one end (or from a control) to the other; `wipe` clips the element away behind it (a `clip-path` animation, the one property besides opacity and transform that moments animate, because the row is revealed rather than moved). Defaults are the remove sweep |
| `stage.unsweep(el, { to, ...cloud })` | The sweep backward; restores a wiped element |
| `stage.ripple(el, { from, edge, duration, spacing })` | Dots along one edge ripple outward from a point: the edge glint and the sheet shimmer. The edge comes from `--fc-glint-edge`; `from` carries `data-glint` while it plays |
| `stage.orbit(el, { count, period, size, signal })` | Dots circle an element's rounded border until the signal aborts |
| `stage.tone(n)` | A tone as a canvas color, refreshed when the theme changes |
| `stage.stop()`, `stage.destroy()` | End every moment; also remove the canvas and its listeners |
| `reducedMotion()`, `alloc(dots, margin)` | The reduced motion check; rule 1 as a pure function (tested in `scripts/dots.test.mjs`) |

Every primitive reads element boxes in viewport coordinates when it starts, returns a Promise that resolves when it
ends or its `signal` aborts, and never rejects. Points are viewport coordinates; an element stands for its center.
`clip` keeps dots inside what clips an element (its scrollers), so a card scrolled half out of a strip keeps its
dots in the strip.

Which stage to use:
- **One-shot moments** play on the app's one shared viewport stage. If their element unmounts mid-moment, the dots
  finish where they started.
- **Loops tied to a scroller** (the orbit) use a stage hosted in that scroller, so they scroll with it and stay under
  sticky bars.
- **Inside a modal dialog**, host the stage in the dialog with `cover: 'viewport'`: the dialog sits in the top layer
  above any page canvas.

## Add a moment

1. **Engine primitive in Facet**, only if no primitive draws it. Add it to `js/dots.mjs` with its types, keep rules 1
   and 2 in the engine, and give it a specimen in `preview/index.html` (Moments).
2. **Facet part** for any new state or control the moment needs (a card state, a hook), with its doc and specimen.
3. **Scene beside the app**, one file per moment in `apps/web/lib/moments/`. It holds the moment's timings as named
   constants that cite `docs/animation/micro-moments/moments.md`, and returns a Promise or a cleanup.
4. **The surface imports its scene** and plays it from the real event, after setting the state. There is no scene
   registry, so a new moment adds a file and edits nothing shared. `useMoments()` gives the shared stage, the Undo toast
   and the live region.

## Named exceptions

Facet allows one looping glow, the gem rating. The principal asked for two more, and they are the only others
(`foundations/layout-materials-motion.md`):

- **The unread sheen**: a slow band of light crosses an unread gem card every 4.2 seconds.
- **The circling dots**: six dots circle the newest unread card, one lap every 5.2 seconds.

Both stop under reduced motion. If either reads as noise in the app, park it for the principal rather than dropping it.
