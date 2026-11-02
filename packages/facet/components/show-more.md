# Show More
> Source: https://vercel.com/geist/show-more (captured 2026-11-02)

## Purpose
An expand/collapse trigger for revealing the rest of a long list or block on the page.

## Anatomy
- Trigger button (`expanded`, `onClick`), drawn with a horizontal rule unless `noBorder` is set. The Table virtualization demo pins it sticky over a fade gradient.

## Variants & sizes
`expanded` (boolean), `noBorder`. No size prop.

## States
Collapsed, expanded.

## Tokens
Inferred: `--ds-gray-400` rule, `text-label-12` (typography page: label-12 is used for "Show More"), secondary button styling.

## Rules
- Use to progressively reveal one long list or block. Use Pagination for sibling pages and Collapse for optional sections.
- Show enough rows (5–10) before cutting off. Cutting at 2 feels pointless.
- Put the hidden count in the label (`Show 12 More`), then `Show Less`, both Title Case.
- Do not collapse again mid-flow once expanded.
- Render small hidden sets in the DOM so find-in-page works. Lazy-load only large ones.
- Trigger is a `<button>` with `aria-expanded` and `aria-controls`. After expanding, move focus to the first new row.

## Hidden Gems usage
- **Signals list** in the Sheet: show the top 5 signals, then `Show 7 More`.
- **Book prices** per market: show the best 3 books, then `Show 9 More`.
- Collapsed slate preview on a landing or summary card, as in the reference's virtualized-table demo.
