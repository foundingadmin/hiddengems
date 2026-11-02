# Middle Truncate
> Source: https://vercel.com/geist/middle-truncate (captured 2026-11-02)

## Purpose
Shortens text by cutting out the middle, so both the beginning and the end stay visible.

## Anatomy
- `MiddleTruncate` (`value`, `className`, `style`) inside a width-constrained container. Uses one `…` glyph. The full value stays in the DOM for copy and assistive tech.

## Variants & sizes
- No variants. Typography comes from `className` (examples: `text-label-14`, `text-copy-14`, `text-label-14 font-mono`). Mono example turns off ligatures with `font-feature-settings: "liga" 0, "calt" 0`.
- Reacts to container width (the demo animates 0–600px).

## States
Fits (no truncation), truncated.

## Tokens
Inherits type tokens from `className`. Demo labels use `text-label-13 text-gray-700`.

## Rules
- Use for strings whose start and end both matter: paths, URLs, IDs, hashes, prefixed branch names. Use end truncation (`…`) for prose and headings.
- Pair with a Tooltip showing the full string, or copy-on-click, when users may need the exact value.
- Uses a single `…` character, not three dots, so monospace values do not lose three cells.
- Width changes on hover cause the cut point to jitter. Lock the width during interaction.
- Copying returns the full original string. Keep it that way if you add custom `onCopy`.
- Do not nest inside another `text-overflow: ellipsis` container.
- Expose the full string as the accessible name. Focusable controls need an explicit `aria-label`. Leave enough of the start visible to identify the item on small screens.

## Hidden Gems usage
- **Long prop names in the slate**: `Patrick Mahomes Over 274.5 Passing Yards (incl. OT)` → `Patrick Mahomes Ov…ds (incl. OT)`. Both the player and the market tail stay visible.
- **Sportsbook market IDs / event IDs** in debug or detail views (mono, ligatures off).
- **Source URLs** for news signals.
- Always pair with a Tooltip or Context Card carrying the full market string.
- Lock column widths in the slate (TableColgroup) so the cut point does not shift on row hover.

## Facet implementation `[F]`
Implemented in `css/data.css` as `.fc-truncate`. CSS only, with the split chosen in markup:

```html
<span class="fc-truncate" title="RB · Anytime TD scorer, 2nd half (incl. OT)">
  <span class="fc-truncate-start">RB · Anytime TD scorer, </span><span class="fc-truncate-end">2nd half (incl. OT)</span>
</span>
```
- The start span ellipsizes with one `…`; the end span never shrinks. Keep the end short (the distinguishing suffix).
- Put the space at the end of the start span. `white-space: pre` keeps it when the string fits, and it is cut with the start when it does not.
- Cap the width with `--fc-truncate-max` (inherited, so set it on the cell or column) or a `<colgroup>`.
- `data-mono` switches to Facet Mono with ligatures off, for IDs and hashes.
- The DOM holds the full string, so copy and screen readers get it. Add a tooltip or `title` with the full value.

### JS helper
Split on the server or at render time. A sensible default keeps the last meaningful segment:
```js
// Split before the last comma, parenthesis or slash; fall back to the last 12 characters.
export function splitForTruncate(s, min = 8) {
  const i = Math.max(s.lastIndexOf(', '), s.lastIndexOf(' ('), s.lastIndexOf('/'));
  const at = i > 0 && s.length - i >= min ? i + 1 : Math.max(0, s.length - 12);
  return [s.slice(0, at).replace(/,$/, ', '), s.slice(at).trimStart()];
}
```
For a pixel-exact cut that fills the box (the reference behavior), measure with a `ResizeObserver` and a canvas `measureText`, then render the same two spans.
