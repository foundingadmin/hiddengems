# Empty State
> Source: https://vercel.com/geist/empty-state (captured 2026-11-02)

## Purpose
Fills a view that has no content yet, or none right now, and explains why and what to do next.

## Anatomy
- `EmptyState` with `icon` (`EmptyStateIcon` wrapping a 32px icon), `title`, `description`, and optional children (CTA `Button` and/or secondary `Link`).

## Variants & sizes
- Design framework: **Blank Slate** (first run, basic), **Informational** (adds an inline CTA and a docs link), **Educational** (starts contextual onboarding), **Guide** (starter content to play with).
- Best practices also name these situations: no-results (filtered to zero), cleared (work done), permission / tier denial, error.
- No size prop.

## States
Static. After an async filter change, wrap it in a live region.

## Tokens
Not specified by the reference. Inferred: `text-heading-*` or `text-label-16` title, `text-copy-14` `--ds-gray-900` description, `--ds-gray-*` icon container.

## Rules
- Pick by situation: no-results for zero filtered rows, blank or informational for never-created, cleared for done, permission for blocked access.
- Show permission and tier denials full-page. Use Note when only one tile inside a page is gated.
- No persistent warnings here, since the empty state disappears when data arrives.
- CTA is a real Button or Link. One primary CTA, at most one secondary. Three is too many.
- `aria-live="polite"` after async filter changes. Never auto-start a tour. Pair `Start tour` with `Skip`.
- Title is sentence case (`No logs match your filter`). The description adds new information.
- Quote a single query with curly quotes. For multi-facet filters use `No {Items} Match Your Filters` and suggest widening.
- Error variant: body plus a copyable request ID and `Try again`.
- CTAs are `Verb + noun`. Never `Get started`, `Continue` or `OK`.

## In practice
- **Filtered board, zero rows**: title `No accounts match your filters`, description `Try lowering Min delta or adding more sources.`, CTA `Clear filters`. Render it outside the Table.
- **Before the first sync**: blank slate `No accounts yet`, description naming when the first sync runs.
- **No watched accounts yet**: informational with CTA `Browse highlights`.
- **Source outage**: error variant with request ID and `Try again` (or the Error component).
