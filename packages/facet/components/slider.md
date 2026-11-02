# Slider
> Source: https://vercel.com/geist/slider (captured 2026-11-02)

## Purpose
Picks a value or range by dragging along a track.

## Anatomy
- Track, thumb(s), optional `label`, optional numeric inputs at the start and/or end of a range.

## Variants & sizes
- `value` (array: one value or `[start, end]`), `onValueChange`, `onValueCommitted` (on release), `label`, `showStartInput`, `showEndInput`, `disabled`, `min`, `max` (and step implied by best practices). No size prop.

## States
Idle, dragging, committed, disabled.

## Tokens
Not specified by Geist.

## Rules
- Use when shape and proximity matter more than precision. Pair with a numeric Input for exact values.
- Snap to a sensible step. Clamp min and max to real limits.
- Always show the live value in tabular numbers with a label naming it (`Sample Rate · 44 kHz`).
- Threshold colors match the product's other breakpoints.
- Give it a name through a label or `aria-label`. Leave native arrow, PageUp/PageDown and Home/End behavior alone.

## Hidden Gems usage
- **Min Edge** filter (0–15%, step 0.5) with `showStartInput`. Commit to the URL on release (`onValueCommitted`) so the slate is not re-filtered on every pixel.
- **Odds range** (e.g. -200 to +300) as a range slider with both inputs.
- **Model weight** sliders (quant vs qualitative) on the settings page.
