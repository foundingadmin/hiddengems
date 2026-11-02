# Grid
> Source: https://vercel.com/geist/grid (captured 2026-11-02)

## Purpose
A two-dimensional cell layout with visible guide lines, the Vercel marketing look.

## Anatomy
- `GridSystem` (`guideWidth`, `dashedGuides`, `debug`, `unstable_useContainer`) > `Grid` (`columns`, `rows`, `height="preserve-aspect-ratio"`, `hideGuides`) > `GridCell` (`column`, `row`, `solid`) and `GridCross` (`column`, `row`). `GridPage` wrapper.

## Variants & sizes
- `columns` / `rows`: numbers, or responsive objects `{ sm, md, lg }` (three breakpoints).
- `hideGuides`: `row` | `column`. `solid` cells hide the guides behind them. Cells can span (`"1/3"`) and overlap.

## States
Static.

## Tokens
Not specified. Guides must reach 3:1 contrast in both themes.

## Rules
- Use for marketing or docs layouts where guides are part of the design. For plain n-column layouts use Tailwind `grid grid-cols-*`.
- No nesting beyond one level.
- Set columns and rows at all three breakpoints. Use `solid` for opaque tiles. Hide guides only when it helps. Hiding both means you want a plain grid.
- Guides are `aria-hidden`. Tappable cells need their own focus rings in reading order.

## Hidden Gems usage
- P2. Not for the dashboard. Use plain CSS grid for card and panel layout. Possibly a marketing or landing page.
