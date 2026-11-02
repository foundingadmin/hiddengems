# Radio
> Source: https://vercel.com/geist/radio (captured 2026-11-02)

## Purpose
A single choice from a small set of mutually exclusive options, all visible.

## Anatomy
- `RadioGroup` (`label`, `value`, `onChange`, `disabled`, `required`, `aria-label`) > `RadioGroupItem` (`value`, children label). Headless `useRadio({ value, disabled })`. Standalone `Radio` (`checked`, `onChange`, `value`, `aria-label`).

## Variants & sizes
Default, disabled, required, headless, standalone. No size prop.

## States
Unselected, selected, disabled, focus (native focus ring, keep `outline-offset`).

## Tokens
Inferred: same as Checkbox.

## Rules
- Use for 2–6 exclusive options where seeing all of them matters. Above 6 use Select or Combobox. Use Toggle for binary and Choicebox for rich options.
- Preselect the safest default unless the choice should be deliberate.
- `required` goes on the group.
- Arrows move within the group and skip disabled items. Tab leaves the group.
- Group label is a Title Case noun in `<legend>` or `aria-labelledby`. Options are parallel.
- Disabled options get a Tooltip. Standalone radios need `aria-label`. Never remove the focus ring.

## Hidden Gems usage
- Settings: `Odds Format` (American / Decimal / Fractional), `Stake Sizing` (Flat / Kelly / Half Kelly).
