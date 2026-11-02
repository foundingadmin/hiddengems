# Filter Params
> Source: https://vercel.com/geist/filter-params (captured 2026-11-02)

## Purpose
A filter bar backed by URL parameters. It shows the active constraints as pills, and they survive refresh and can be shared as a link.

## Anatomy
- `FilterParamsBar` taking `params: FilterParam[]` and optional `ai`.
- Each `FilterParam`: `key` (display name), `type`, `label(value)` (pill text, including the "all" fallback), `encode(value) → URL params`, `decode(params) → value`, plus type-specific fields.
- Helpers: `encodeDateRangeValue` / `decodeDateRangeValue`, `useSearchParamState`, `useFilterParam`.

## Variants & sizes
- `type: 'select'` with `options`.
- `type: 'multi-select'` with `options` and `optionLabel`. The example label reads `3 Statuses` or `All Statuses`.
- `type: 'date-range'` with `presets: [{ label, range() }]`. The label falls back to `Any Time`.
- `type: 'readonly'`: shows page context that cannot be changed or removed. Uses `onLoad` for the authoritative value and an optional `note` shown in a hover card.
- `suggestion: () => value`: an optional suggested starting value. It stays optional until the user picks it.
- `ai: { isThinking, onQuery, onAbort }`: natural-language filter suggestions.
- No size or variant props.

## States
No filters / all. Filter applied (pill). Suggestion offered. Readonly. AI thinking (abortable).

## Tokens
Not specified by the reference. Inferred: Badge/pill and Menu/Combobox tokens, `text-label-13` / `text-label-14`.

## Rules
- Use on list or search pages where active constraints should be visible, linkable and kept on refresh.
- Short filter names. Option labels should make sense without reopening the menu.
- Each filter encodes only the URL params it owns, so removing one pill never clears unrelated state.
- Suggestions are useful defaults, never replacements for explicit choices.
- Labels must name both the constraint and the value clearly for screen readers.

## Hidden Gems usage
- **Main slate filter bar** (P0):
  - `Sportsbook` (multi-select, label `All Books` / `3 Books`).
  - `Market` (multi-select: Spread, Total, Moneyline, Player Props…).
  - `Game` (select or multi-select).
  - `Confidence` (multi-select High / Medium / Low).
  - `Min Edge` (select: `Any Edge`, `≥ 2%`, `≥ 5%`).
  - `Kickoff` (date-range with presets `Today`, `This Week`, `Sunday Main Slate`).
- `readonly` filter for `Season` / `Week` context set by the route, with a `note` explaining it.
- `suggestion` for `Market: Player Props` on first load, so it does not count as a user choice.
- The `ai` slot fits "show me underdog receivers with positive edge" queries later (P1/P2).
- Use one URL key per filter (`books`, `markets`, `minEdge`) so links to a filtered slate are shareable.
