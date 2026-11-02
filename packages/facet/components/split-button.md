# Split Button
> Source: https://vercel.com/geist/split-button (captured 2026-11-02)

## Purpose
A primary action button joined to a dropdown trigger that holds a few closely related alternative actions.

## Anatomy
- Primary `Button` (configured through `buttonProps`) plus the child label.
- Chevron trigger (labelled by `menuButtonLabel`).
- Menu (`menuProps`, e.g. `width: 264`) with `SplitButtonMenuItem`s, each with `title`, optional `description`, optional `icon` and `menuItemProps` (onClick, className).

## Variants & sizes
- `buttonProps.size`: `small` | `medium` | `large` (same heights as Button).
- `buttonProps.variant`: limited to `default` | `secondary`. The API blocks destructive variants.
- `menuAlignment`: `bottom-start` (default) | `bottom-end`.
- Item `title` can contain an inline icon.

## States
Inherits Button states. Menu open and closed. Item hover and focus come from Menu (inferred).

## Tokens
Inherits Button and Menu tokens (`--ds-shadow-menu`, 12px menu radius from materials; inferred).

## Rules
- Use when there is one clear default plus 1–4 close variants. Use `Menu` for unrelated actions.
- The first dropdown item must repeat the primary action with exactly the same label.
- No destructive primary. If destructive items exist, put them at the bottom after a divider.
- Items are sentence case `Verb + noun`.
- `menuButtonLabel` is a screen-reader sentence naming the action set (`More deploy options`). It becomes the trigger's `aria-label`.
- Use `bottom-end` only when the button sits flush against a right edge.

## Hidden Gems usage
- **Export**: `Export CSV` primary with `Export CSV`, `Copy as text`, `Copy bet slip` in the menu.
- **Track Bet**: primary `Track bet` with `Track at current line`, `Track with custom line…`.
- Keep to `secondary` `small` in toolbars, so it does not compete with the slate.
