# Button
> Source: https://vercel.com/geist/button (captured 2026-11-02)

## Purpose
Runs an action (submit, open a dialog, mutate state). `ButtonLink` has the same look for navigation.

## Anatomy
- Container with an optional `prefix` icon, label and optional `suffix` icon.
- Built-in loading spinner, shown in place when `loading` is set.
- Icon-only mode: `svgOnly` plus a required `aria-label`.

## Variants & sizes
- `size`: `tiny` (icon-only demos only), `small`, `medium` (default), `large`.
  | size | height (measured) | x-padding | radius | font |
  |---|---|---|---|---|
  | tiny (svgOnly) | 24px | 0 | 4px | n/a |
  | small | 32px | 6px | 6px | `--geist-form-small-font` (0.875rem) |
  | medium | 36px (`--ds-size-medium`) | 10px | 6px | 14px |
  | large | 40px (`--ds-size-large`) | 14px | 8px | `--geist-form-large-font` (1rem) |
  Square or circle `svgOnly` buttons are as wide as they are tall. Spinner is 16px at small.
- `variant` (in examples) / `type` (in best practices): `default` (primary), `secondary`, `tertiary`, `error`, `warning`. `primary`, `success`, `ghost` and `violet` are **not** valid.
  - default: background `--ds-gray-1000`, text `--ds-background-100`.
  - secondary: background `--ds-background-100`, text `--ds-gray-1000`, 1px ring `--ds-gray-400`, hover background `--ds-gray-alpha-200`.
  - tertiary: transparent, no border, hover `--ds-gray-alpha-200`.
  - error: solid `--ds-red-800`, hover `--ds-red-900`, contrast text.
  - warning: solid `--ds-amber-800`, near-black text.
  (measured from rendered CSS)
- `shape`: `square` | `circle` | `rounded` (pill). `shadow` adds elevation (marketing use).
- `prefix`, `suffix` (icons). `loading`, `disabled`. `typeName` carries the HTML `type` attribute (e.g. `"submit"`).
- `ButtonLink` (navigation) and `CustomButton` (custom normal / hover / active foreground, background and border colors, plus `width`).

## States
- Hover: background changes per variant (above). Transition 150ms ease-in-out (measured).
- Focus: `box-shadow: var(--ds-focus-ring)`, a 2px background-colored gap and then a 2px blue-700 ring (measured).
- Disabled: text `--ds-gray-700`, background `--ds-gray-100`, ring `--ds-gray-400`, `cursor: not-allowed`. Tertiary disabled is transparent at 50% opacity.
- Loading: spinner replaces content. The button stays focusable and reports busy.

## Tokens
`--ds-gray-1000`, `--ds-background-100`, `--ds-gray-400`, `--ds-gray-alpha-200`, `--ds-gray-100`, `--ds-gray-700`, `--ds-red-800/900`, `--ds-amber-800`, `--ds-focus-ring`, `--ds-size-medium`, `--ds-size-large`. Type: `text-button-14` (default), `text-button-16` (large), `text-button-12` (only for tiny buttons inside inputs).

## Rules
- Button for mutations, ButtonLink for URL changes. Use `Menu` or `SplitButton` when several related actions share a row.
- Primary is the default. Use secondary for the supporting action and error for destructive confirmation.
- Set `typeName="submit"` for forms. `type` / `variant` controls appearance, not the HTML type.
- Use `loading`, not a hand-swapped spinner.
- Only disable when the action is currently impossible, and pair it with a Tooltip explaining why.
- Labels are sentence case and say what happens (`Deploy project`). No bare `Submit` / `OK` / `Confirm`. Destructive buttons use `Verb + Noun` and match their toast (`Delete project` → `Project deleted`). Mode switches end with `Instead`.
- Icon-only buttons need `svgOnly` and an `aria-label` that names action and target (`Copy deployment URL`). The reference's validator throws without them.
- Never add `aria-label` to a button that already has visible text.

## Hidden Gems usage
- Use `small` (32px) for toolbar and in-table actions (`Track bet`, `Open in book`). Use `medium` for sheet footers.
- Use `tertiary` `svgOnly` square `small` for row icon actions (star or track, copy bet string), with Tooltips.
- Use `secondary` for `Refresh odds`. Use `loading` while refetching rather than disabling.
- Disable `Track bet` when the market is suspended, with a Tooltip `Market suspended at FanDuel.`
- Hidden Gems has almost no destructive actions. Reserve `error` for things like `Delete saved filter`.
