# Pagination
> Source: https://vercel.com/geist/pagination (captured 2026-11-02)

## Purpose
Previous/Next links between sibling pages in a sequence (docs-style). It is not a numbered pager.

## Anatomy
- `Pagination` with `previous={ title, href }` and `next={ title, href }`. Geist renders the `Previous` / `Next` label, a chevron, and an accessible label of the form `Go to {direction} page: {title}`.

## Variants & sizes
None documented.

## States
Either slot can be omitted. At the start or end of a sequence, hide it rather than disabling it.

## Tokens
Not specified by Geist.

## Rules
- Use for sequential sibling pages (articles, onboarding steps). Use `ShowMore` or a numbered pager for more rows of the same dataset. Geist does not document a numbered pager.
- Titles are destination names in Title Case, short, with the distinctive word first, because long titles get truncated.
- Do not put ordinals (`Page 3 of 10`) in the titles.

## Hidden Gems usage
- P2. Fits **week-to-week navigation** (`Week 8` ← → `Week 10`) on a historical results page, or a methodology/docs section.
- Not for paging the bet slate. Use virtualization, `ShowMore` or `LoadMoreButton`, with range copy `21–40 of 142` per Table rules.
