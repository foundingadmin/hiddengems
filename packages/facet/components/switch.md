# Switch
> Source: https://vercel.com/geist/switch (captured 2026-11-02)

## Purpose
A segmented control for choosing one of 2–3 mutually exclusive views of the same content.

## Anatomy
- Container: background `--ds-background-100`, 4px padding, radius 6px, 1px ring `--ds-gray-alpha-400`.
- `SwitchControl` items: each is a visually hidden radio plus a label segment. Selected segment is filled `--ds-gray-100`, radius 4px.
- Optional `icon` per control. The `label` is always required and is screen-reader-only when an icon is shown.

## Variants & sizes
- `size` on `Switch` (or per control): `small` 32px, default 36px (`--ds-size-medium`), `large` 40px (`--ds-size-large`) (measured).
- Segment text: 14px medium, 12px horizontal padding. Inactive `--ds-gray-900`, hover and selected `--ds-gray-1000`.
- Props: `name` (groups radios), `defaultChecked` / `checked`, `disabled`, `value`, `label`, `icon`. Full width via `style={{ width: '100%' }}`. Can be wrapped in `Tooltip` (`desktopOnly`).

## States
Default, hover, selected, disabled (text `--ds-gray-800`), focus-visible (`--ds-focus-ring`).

## Tokens
`--ds-background-100`, `--ds-gray-alpha-400`, `--ds-gray-100`, `--ds-gray-900`, `--ds-gray-1000`, `--ds-gray-800`, `--ds-focus-ring`, `--ds-size-medium/large`.

## Rules
- Use for 2–3 exclusive views (`Source` / `Output`). Use `Toggle` for a boolean. It has radio semantics.
- Past 3 options or longer labels, use `Tabs` or `Select`.
- Always pass `name`, and make exactly one control checked initially.
- Size segments so the widest label fits without the selected pill changing size.
- Labels are Title Case, 1–2 words, and parallel.
- Every control needs a `label`, even icon-only ones. Add a Tooltip per control for icon-only switches.

## Hidden Gems usage
- **Odds format**: `American` / `Decimal` (`small`).
- **Slate layout**: icon switch `Table` / `Cards` with Tooltips.
- **Chart range** in Line History: `24H` / `3D` / `7D`.
- Never use it for filtering many books. Use FilterParams.
