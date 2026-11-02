# Checkbox
> Source: https://vercel.com/geist/checkbox (captured 2026-11-02)

## Purpose
A two-state control (checked or unchecked) used for multi-select lists and acknowledgements.

## Anatomy
- Box plus label (`children`). Optional `indeterminate` dash.

## Variants & sizes
- `checked`, `onChange`, `disabled`, `indeterminate`. No size prop. Box size likely relates to `--ds-control-decoration-size` 14px (captured computed token; inferred).

## States
Unchecked, checked, indeterminate, disabled (each of the three).

## Tokens
Inferred: `--ds-gray-1000` checked fill, `--ds-gray-alpha-400`/`500` border, `--ds-focus-ring`.

## Rules
- Use for multi-select lists, table row pickers and acknowledgements. Use Toggle for a single boolean setting.
- Indeterminate is a visual state driven by the parent's partial selection, not a third value.
- Required acknowledgements validate on submit, not on blur.
- Disabled checkboxes get a Tooltip explaining why.
- Group label (above the `<fieldset>`) is a sentence case noun with no colon. Acknowledgement labels are full sentences with a period. Show the partial count next to an indeterminate group (`3 of 5 selected`).
- Wrap groups in `<fieldset>` / `<legend>`. Row-select checkboxes use `aria-label="Select {row}"`. Keep the label/htmlFor click area.

## Hidden Gems usage
- **Bulk select slate rows** (`Track selected`, `Compare`): header checkbox indeterminate with `3 of 42 selected`.
- Acknowledgement: `I understand these are research signals, not guarantees.`
