# Input
> Source: https://vercel.com/geist/input (captured 2026-11-02)

## Purpose
A single-line text field.

## Anatomy
- Wrapper (`data-geist-input-wrapper`): 1px ring, radius 6px, overflow hidden.
- Optional `prefix` / `suffix` (text or icon, with or without styled background or container).
- The `<input>`.
- Optional `label`. Error message with a warning icon below (`error`).

## Variants & sizes
- `size`: `small` 32px, default/`medium` 36px (`--ds-size-medium`), `large` 40px (`--ds-size-large`) (measured). Horizontal padding 12px. Text 14px (16px at large). Icon size 16px (20px at large).
- `prefix`, `suffix`, `prefixStyling={false}`, `suffixStyling={false}`, `suffixContainer={false}`, `rounded` (pill-shaped prefix and suffix).
- `label` (needs `id`), `aria-labelledby`, `disabled`, `error` (string), `placeholder`.
- Related components: `SearchInput` (search icon, Escape clears, `cmdk` hint) and `ClearableInput` (see search-input.md, misc.md).

## States
- Default: ring `--ds-gray-alpha-400`, background `--ds-background-100`, placeholder `--ds-gray-700`.
- Hover: ring `--ds-gray-alpha-500`.
- Focus: ring `--ds-gray-alpha-600` plus a 4px `rgba(0,0,0,.16)` halo (light) or `rgba(255,255,255,.24)` (dark). This is the `--ds-focus-border` pattern, not the blue focus ring.
- Disabled: background `--ds-gray-100`, text `--ds-gray-700`, `not-allowed` cursor.
- Error: ring `--ds-red-900` with a 4px `--ds-red-300` halo (`--ds-red-500` when focused), `aria-invalid`, and the message linked with `aria-describedby`.
(measured)

## Tokens
`--ds-gray-alpha-400/500/600`, `--ds-background-100`, `--ds-gray-700`, `--ds-gray-100`, `--ds-red-900/300/500`, `--ds-size-medium/large`, `--ds-focus-border`.

## Rules
- Use for single-line free text. Use `Textarea` for wrapping text, `Combobox` for known lists, and the search variant (`SearchInput`) with a scoped placeholder for search.
- Validate on blur and pass a string to `error`. Trim whitespace before submit.
- Keep the field focusable while saving.
- Do not wrap a labelled Input in a Tooltip. Put help on a sibling icon button.
- Labels are short sentence case nouns. Placeholders show an example value, not instructions. Helper text is one sentence with a period, linked by `aria-describedby`.
- Errors name the field and constraint, end with a period, and never say "please" (`Code must be 6 digits.`).
- A string `label` requires an `id`. Icon-only buttons inside input rows use `Button svgOnly aria-label`.

## Hidden Gems usage
- **Stake / unit size**: `size="small"`, `prefix="$"`, `suffix="u"`, right-aligned numeric text. Error `Stake must be greater than 0.`
- **Custom line entry** when tracking a bet at a different number.
- **Min edge threshold** in settings: suffix `%`.
- Use 32px small inputs in toolbars next to small buttons. Keep default 36px in sheets and forms.
