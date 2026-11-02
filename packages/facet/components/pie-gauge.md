# Pie Gauge
> Source: https://vercel.com/geist/pie-gauge (captured 2026-11-02)

## Purpose
An icon-sized inline indicator that shows a percentage as a filled pie inside a ring. It is meant to sit inline with text.

## Anatomy
- Outer ring plus an inner pie wedge that fills clockwise from 12 o'clock.
- No built-in text. The number is written next to it in the surrounding markup.

## Variants & sizes
- `value`: 0–100. Out-of-range values are clamped. Non-finite values render as 0.
- `size`: default **16px**. Geist uses **13px** on compact surfaces (e.g. build cache summary). The demo also shows 24px and 32px. `width` / `height` can be set separately.
- `color`: takes a Geist color token name (e.g. `blue-900`, `amber-900`, `red-900`). When omitted, it inherits `currentColor` from the surrounding text.

## States
Static. No interactive states documented.

## Tokens
`currentColor` by default, otherwise `--ds-{color}-900` through `color` (the demos use 900 steps). Shown with `text-label-14` labels in the demos.

## Rules
- Every demo marks the icon `aria-hidden="true"` and writes the value as visible text next to it (`50%`). Follow that pattern so the number is always readable and announced.
- Use the 13px size inside dense rows. Match the size to the adjacent type.
- Best-practice prose is **not specified by Geist** for this page.

## Hidden Gems usage
- **Score column in the bet slate**: `<PieGauge size={13} aria-hidden /> 72` with `text-label-13` tabular numbers. Color by score band using the same thresholds as `Gauge` (e.g. green-900 / amber-900 / red-900 or inherited gray).
- **Signal agreement** (share of signals agreeing with the pick) in signal-breakdown rows.
- **Book coverage** (share of tracked books offering the market) next to the market name.
- Never use it alone in a cell. The number always goes next to it.
