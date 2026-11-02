# Select
> Source: https://vercel.com/geist/select (captured 2026-11-02)

## Purpose
A native dropdown for picking one value from a short, fixed list.

## Anatomy
- Native `<select>` with custom chevron (right padding 36px reserved), optional `prefix` / `suffix` icons, optional `label`, error message area.

## Variants & sizes
- `size`: `small` 32px (`--geist-form-small-height`), default 36px (`--geist-form-height`), `large` 40px (`--geist-form-large-height`) (measured). Font 0.875rem (small/default) / 1rem (large). Radius 6px (`--geist-radius`), large uses 8px.
- Props: `placeholder`, `label`, `aria-label`, `prefix`, `suffix`, `disabled`, `error` (string), `required`, `defaultValue`, `value`, native `<option>` / `<optgroup>` children.

## States
- Default: background `--ds-background-100`, text `--ds-gray-1000`, 1px ring `--ds-gray-alpha-400`.
- Hover: ring `--ds-gray-alpha-500`.
- Focus: `--ds-focus-border` (1px dark + 4px soft ring). Focus-visible: `--ds-focus-ring`.
- Disabled: background `--ds-gray-100`, text `--ds-gray-700`.
- Error (`aria-invalid`): ring in the themed border color plus a 4px halo of `--ds-red-900` at 16%, with the message below.
(measured)

## Tokens
`--ds-background-100`, `--ds-gray-1000`, `--ds-gray-alpha-400/500`, `--ds-focus-border`, `--ds-focus-ring`, `--ds-gray-100`, `--ds-gray-700`, `--ds-red-900`, `--geist-form-*-height`.

## Rules
- Use for fewer than about 10 fixed items. Use `Combobox` when typing to filter helps, `MultiSelect` for multiple values, and `Switch` for 2–3 segments.
- Past about 10 items, group with native `<optgroup>`. There is no Group sub-component.
- Options are Title Case with canonical branding. Label is a short Title Case noun.
- Placeholder is action-oriented (`Select a framework`). Never `Choose one…`.
- Validate on blur. Error strings name the field and end with a period (`Select a framework.`).
- Do not wrap a labelled Select in a Tooltip. Put help on a sibling icon button.

## Hidden Gems usage
- **Week selector** (`Week 9`), **Sort By** (`Edge`, `Score`, `Kickoff`), **Odds format** if Switch does not fit.
- Use `small` in the slate toolbar to match 32px buttons and inputs.
- Sportsbook choice has more than 10 options and is multi-valued, so it belongs in FilterParams or MultiSelect, not Select.
