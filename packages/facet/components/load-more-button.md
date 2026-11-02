# Load More Button
> Source: https://vercel.com/geist/load-more-button (captured 2026-11-02)

## Purpose
A full-width button that appends the next batch of items to a paginated list.

## Anatomy
- Full-width button with a text label and a built-in loading state.

## Variants & sizes
- `loading`, `noGap` (removes the spacing above it, inferred from the name), `noBorderRadius`, custom label text (`Show More Results`).
- Heights **not specified by Geist**.

## States
Idle, loading.

## Tokens
Not specified. Inferred: secondary-button tokens (`--ds-background-100`, `--ds-gray-400` ring, `--ds-gray-alpha-200` hover).

## Rules
No best-practices section on this page. From related pages: use `loading` rather than a separate spinner, and name what loads in Title Case.

## Hidden Gems usage
- Bottom of **historical results** and **news feed** lists: `Load More Results`.
- Use `noBorderRadius` / `noGap` when attached flush to the bottom of a table card.
