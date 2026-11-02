# Description
> Source: https://vercel.com/geist/description (captured 2026-11-02)

## Purpose
A key/value pair: a short heading with its value, with optional tooltip context.

## Anatomy
- Renders `<dl>` / `<dt>` / `<dd>`. `title` (term), `content` (value), optional `tooltip` (info icon next to title).

## Variants & sizes
- `right` (right-aligned text), `ellipsis` (truncate long content to one line). No size prop.

## States
Static. Tooltip on hover or focus.

## Tokens
Not specified. Inferred: `text-label-13`/`14` `--ds-gray-900` title, `text-copy-14` `--ds-gray-1000` value.

## Rules
- Use for definition-list metadata (`Last Deployed`, `Region`). Use the field's helper text for form hints.
- Keep the dl/dt/dd semantics. Do not wrap in extra paragraphs.
- Title is a Title Case noun. Content is sentence case unless it is a literal ID or timestamp.
- Add `tooltip` only when the title is ambiguous. One sentence ending in a period.
- No interactive controls in the title slot.

## Hidden Gems usage
- **Bet Sheet summary grid**: `Sportsbook` DraftKings, `Line` o64.5, `Odds` -115, `Implied Prob` 53.5%, `Model Prob` 58.9%, `Edge` +5.4% (tooltip defining Edge), `Updated` (RelativeTimeCard). Use `right` for numbers in two-column layouts.
