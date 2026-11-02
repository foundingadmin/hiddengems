# Context Card
> Source: https://vercel.com/geist/context-card (captured 2026-11-02)

## Purpose
A floating card shown on hover or focus that can hold richer content than a tooltip, such as an entity preview with metadata.

## Anatomy
- `ContextCardTrigger` (`content`, `side`, `align`, `render`) wrapping the trigger. By default it renders a `<div>`. `render` can turn the trigger into an `<a>`, button or badge.

## Variants & sizes
- `side`: `top` | `bottom` | `left` | `right`. `align`: `start` | `center` | `end`. No size prop.

## States
Hidden, open (hover or focus, ~150ms entry delay), closed (cursor exit, blur, Escape).

## Tokens
Not specified. Inferred: menu/popover material (12px radius, `--ds-shadow-menu`), `--ds-motion-popover-*`.

## Rules
- Use for entity metadata previews (user, deployment, project). Use Tooltip for a one-line "why" and Drawer or a page for long content or forms.
- Never put destructive actions in it, because it can close before the user commits.
- Keep the ~150ms delay. At most one primary action. More than one belongs in a Menu.
- No nesting inside Tooltips or other Context Cards.
- Content: Title Case entity name, one identifying line, then 2–4 `Label: value` rows (use `–` for unknown). Do not repeat what the trigger already shows.
- The trigger keeps its own accessible name. Card content is keyboard reachable. Escape returns focus.

## Hidden Gems usage
- **Player hover card** on names in the slate: `Travis Kelce`, `KC · TE`, then `Last 3 Avg: 71.3 yds`, `Target Share: 24%`, `Injury: Unknown`, with one action `View Player`.
- **Book price card** on an odds cell: best and worst price across books, plus `Updated` time.
- **Market name** card: full untruncated prop name plus market ID, as the companion to MiddleTruncate.
