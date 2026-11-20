# Tabs
> Source: https://vercel.com/geist/tabs (captured 2026-11-02)

## Purpose
Switches between sibling views inside one page that share scope and data.

## Anatomy
- `role="tablist"` container: horizontal, scrolls horizontally without a scrollbar, 24px gap between tabs (primary), inset 1px bottom rule.
- `role="tab"` buttons with optional `icon`, `title`, and per-tab `disabled` + `tooltip`.

## Variants & sizes
- Props: `tabs=[{ title, value, icon?, disabled?, tooltip? }]`, `selected`, `setSelected`, `disabled` (whole set), `variant` (`primary` default | `secondary`).
- **Primary** (measured): 14px text, padding 14px vertical / 2px horizontal, inactive `--ds-gray-900`, hover and selected `--ds-gray-1000`. Selected tab has a 2px bottom border in `--ds-gray-1000`. The list bottom rule uses legacy `--accents-2`.
- **Secondary** (measured): pill segments 32px high, 12px horizontal padding, radius 6px, `text-label-13`. Selected tab gets background `--ds-gray-200`. No underline.
- No size prop.

## States
Default, hover (text darkens), selected, disabled (whole set or per tab; per-tab can show a tooltip), focus-visible (`--ds-focus-ring` box shadow).

## Tokens
`--ds-gray-900`, `--ds-gray-1000`, `--ds-gray-200`, `--ds-focus-ring`, legacy `--accents-2` (rule). `text-label-13` (secondary), 14px (primary).

## Rules
- Use only for sibling views (`Overview`, `Logs`, `Settings`). Navigation between unrelated pages belongs in a sub-menu.
- At most 5–7 tabs on desktop and 3–4 on mobile. Move extras into a `Menu`.
- Switching is instant: no network confirmation and no toast.
- Reflect the active tab in the URL.
- Only disable a tab for permission or empty-state reasons, and add a `tooltip` that names the constraint (sentence case).
- Titles are sentence case 1–2 word nouns. No verbs (`View logs` is wrong). Never put a count in the title (`Logs (12)`). Use a badge slot and hide it at zero.
- Left/Right moves between tabs, Enter/Space activates. Add `aria-label` on the tablist when no heading labels it. Never suppress the focus ring.

## Hidden Gems usage
- **Bet detail Sheet**: primary tabs `Overview` / `Signals` / `Line history` / `News`.
- **Slate scope** above the table: secondary tabs `All` / `Props` / `Spreads` / `Totals`, synced to a URL query param. The reference's guidance means market-type *filtering* with multiple values belongs in `FilterParams`. Tabs only fit if these are truly separate views.
- Show per-tab counts (e.g. new gems) in a small badge slot, never in the title. Drop the badge at zero.
