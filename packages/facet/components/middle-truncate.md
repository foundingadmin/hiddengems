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
