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

## Facet implementation `[F]`
Implemented in `css/data.css` as `.fc-filter-bar`. Specimen: `preview/index.html#data`.

### Order
Search, Add filter, readonly context, applied chips, suggestions, then the sort control at the end. Everything wraps; the sort stays at the right edge.

### Parts
| Part | Markup | Notes |
|---|---|---|
| Bar | `<div class="fc-filter-bar" role="search" aria-label="Filter picks">` | 8px gap, wraps |
| Search | `.fc-filter-search` > icon + `.fc-input[data-size="small"]` | Full width on phones, 240px from 640px. Placeholder ends with `…` |
| Add filter | `.fc-button[data-variant="secondary"][data-size="small"][data-shape="rounded"]` + filter icon | 32px pill, opens the filter menu (`aria-haspopup="menu"`) |
| Applied chip | `.fc-filter-chip` (group) > `.fc-filter-edit` (key + values) + `.fc-filter-remove` | Key in `--fc-text-secondary`, value in primary 500. Several values sit in one pill, split by a hairline |
| Suggestion | `button.fc-filter-chip[data-state="suggested"]` + plus icon | Dashed edge, muted value. Clicking applies it |
| Readonly | `.fc-filter-chip[data-state="readonly"]` + optional `.fc-filter-info` | No remove. The info button's tooltip says where the value comes from |
| Removable `[F]` | `.fc-filter-chip` (group) > `.fc-filter-key` + `.fc-filter-value` + `.fc-filter-remove` | Key, value and remove only, no edit menu: for a filter set by a link (`?source=`). The remove sits 4px from the pill's end, as on an applied chip |
| Sort | `.fc-filter-sort` > sort icon + `.fc-select[data-size="small"]` | Synced with the sorted table header |

### Removable chip `[F]`
Owner request, 2026-11-03. A filter that arrives in a link and has nothing to edit (one value, chosen elsewhere) shows as key, value and remove.
```html
<span class="fc-filter-chip" role="group" aria-label="Source filter">
  <span class="fc-filter-key">Source</span>
  <span class="fc-filter-value">Results</span>
  <a class="fc-filter-remove" href="/data/logs" aria-label="Show all sources"><svg aria-hidden="true">…</svg></a>
</span>
```
- The remove is a link when removing is navigation (it drops the key from the URL, INT-27), a button otherwise. Its name says what you get ("Show all sources") or what goes ("Remove source filter") (CON-19).
- States: rest, remove hover (gray circle), remove focus (focus ring, INT-02). The 24px remove target is the only control (INT-04).
- Hidden Gems usage: Logs, `?source=` from a Data health row.

### Accessibility
- The remove button names the filter: `aria-label="Remove book filter"`. After removal, focus moves to the next chip or to Add filter.
- A suggestion's name says what it does: `aria-label="Add filter Window, Early"`.
- The chip group has `aria-label="Book filter"`; the edit button reads key then value.

### URL state
- One query key per filter, owned by that filter: `?week=8&book=dk&market=atd,ftd&sort=gap&dir=desc&pick=gesicki`. Removing a chip deletes only its key.
- Use `history.replaceState` for typing in search (debounced) and `pushState` for chip, sort and sheet changes, so Back undoes one decision at a time.
- Suggestions and readonly context are not written to the URL until the user applies them; readonly values come from the route.
- Restore every chip, the sort and the open pick from the URL on load, before the first paint where possible.
