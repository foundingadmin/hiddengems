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
- `aria-live="polite"` after async filter changes. Never auto-start a tour. Pair `Start Tour` with `Skip`.
- Title is Title Case (`No Logs Match Your Filter`). The description adds new information.
- Quote a single query with curly quotes. For multi-facet filters use `No {Items} Match Your Filters` and suggest widening.
- Error variant: body plus a copyable request ID and `Try Again`.
- CTAs are `Verb + Noun`. Never `Get Started`, `Continue` or `OK`.

## Hidden Gems usage
- **Filtered slate, zero rows**: title `No Bets Match Your Filters`, description `Try lowering Min Edge or adding more sportsbooks.`, CTA `Clear Filters`. Render it outside the Table.
- **Off-season / no games scheduled**: blank slate `No Games This Week`, description naming when the next slate opens.
- **No tracked bets yet**: informational with CTA `Browse Today’s Gems`.
- **Feed outage**: error variant with request ID and `Try Again` (or the Error component).
