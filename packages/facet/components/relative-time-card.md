# Relative Time Card
> Source: https://vercel.com/geist/relative-time-card (captured 2026-11-02)

## Purpose
Shows a short relative time (`2m ago`). Hovering opens a popover with the exact local and UTC time.

## Anatomy
- Trigger: the formatted relative time, or custom `children`.
- Popover (`side`) with absolute UTC and local time.

## Variants & sizes
- Props: `date` (number, Unix ms), `side` (e.g. `top`), `children` (only for non-time labels).
- Canonical short forms: `2m`, `5h`, `Yesterday`. The formatter adds ` ago` itself.

## States
Idle, hover/focus (popover open).

## Tokens
Not specified by the reference. Inferred: popover material (`--ds-shadow-menu` or tooltip shadow), `text-label-13` / `text-copy-13`.

## Rules
- Use for recent timestamps in scannable places (Table cells, Entity rows, feeds). In prose, write absolute dates (`Mar 14, 2026`) once older than 7 days.
- Pass a number. Do not pre-format, and do not replace `children` with a formatted string.
- Never add `ago` after it (`2m ago ago`).
- Use `children` only for states such as `Just now`, `Pending`, `Queued`.
- Add a leading label when the context is unclear (`Last deploy <RelativeTimeCard/>`). Do not repeat absolute time elsewhere in the row.

## Hidden Gems usage
- **Odds last updated** in each slate row (`Updated` column) and next to the freshness indicator.
- **Line moved** times in Line History (`Moved 18m ago`).
- **News published** times on qualitative signals.
- Hidden Gems note: odds go stale within minutes. Pair the time with freshness color (Badge or Facet StatusDot extension) once older than the stale threshold. The card itself carries no staleness color.
