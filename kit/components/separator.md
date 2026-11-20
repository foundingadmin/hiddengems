# Separator
> Source: https://vercel.com/geist/separator (captured 2026-11-02)

## Purpose
A thin divider line between sections, horizontal or vertical.

## Anatomy
- A single line element.

## Variants & sizes
- `orientation`: `horizontal` (default) | `vertical` (needs a parent with height, e.g. `h-8`).
- `inset`: for dividers meeting a 1px frame painted over the content. It reserves 1px at each end and uses solid `--ds-gray-400`. Not needed when the parent has a real border.

## States
Static. Can be `aria-hidden` when purely decorative (as in the inset demo).

## Tokens
`--ds-gray-400` (stated for `inset`; default color inferred to be the same gray border step).

## Rules
- No best-practices section. From the Colors page: draw each border once. Keep dividers inside the border so alpha borders do not overlap and double up at intersections.

## Hidden Gems usage
- Between Sheet sections (Overview metrics / Signals / News).
- Vertical separators in the toolbar between filter, sort and view controls.
- Use `inset` inside framed cards (e.g. summary cards with a ring border).
