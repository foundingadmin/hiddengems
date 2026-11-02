# Drawer
> Source: https://vercel.com/geist/drawer (captured 2026-11-02)

## Purpose
A mobile-only bottom sheet for short, focused tasks.

## Anatomy
- `Drawer` (`show`, `onDismiss`, `height`) wrapping content (title, body, actions). The best-practice prose mentions `DrawerTitle`, `verticalScroll` and `customHeight`.

## Variants & sizes
- Default height or custom `height` (e.g. 200). Exact default height is **not specified by Geist**.

## States
Hidden, shown, dismissing (tap outside, swipe down, Escape, system back).

## Tokens
`--ds-z-drawer` 200 (captured computed tokens). Overlay motion tokens (inferred).

## Rules
- Small viewports only. On desktop use Modal or Sheet.
- Never for destructive confirmation, because the dimming is too weak.
- Good for one form, a filter sheet, or one CTA plus `Cancel`.
- Keep tap-outside and swipe-down dismissal unless the form has unsaved input.
- Scroll inside the drawer (`verticalScroll`). Only cap height when the primary action would be clipped. Actions stay above the fold.
- Title is a Title Case statement naming the entity, not the page heading repeated.
- Trap focus, return it on close, handle Escape and the system back gesture, and lock body scroll.

## Hidden Gems usage
- Mobile: **filter sheet** (books, markets, confidence) and **bet detail** on narrow screens, in place of the desktop Sheet.
