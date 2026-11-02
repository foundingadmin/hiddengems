# Search Input
> Source: https://vercel.com/geist/search-input (captured 2026-11-02)

## Purpose
A ready-made search field with a magnifying-glass icon and a clear button. Pressing Escape clears it.

## Anatomy
- Input (see input.md) with a leading search icon (replaceable with `prefix`).
- Clear button when there is a value.
- Optional `⌘ K` hint (`cmdk`), which changes to `Esc` once the field has a value.
- Loading indicator (`loading`).

## Variants & sizes
- Props: `value`, `onChange`, `placeholder`, `aria-label`, `cmdk`, `disabled`, `loading`, `prefix`.
- Sizes are not specified on this page. Presumably the Input size scale applies (inferred).

## States
Empty, typing (clear button shown), loading, disabled, cmdk hint (`⌘ K` when empty, `Esc` when dirty).

## Tokens
Input tokens. `KeyboardInput` styling for the hint (inferred).

## Rules
(From the Input and CommandMenu pages, since this page has no best-practices section.)
- The placeholder names the scope (`Search projects`) and doubles as the role hint.
- Do not embed it inside an unrelated form.
- `⌘K` is reserved for the global command menu. Do not bind it to an in-page filter input. Show the `cmdk` hint only when the field actually opens the command menu.

## Hidden Gems usage
- **Slate quick filter**: `Search players, teams, markets` with `loading` while querying and Escape to clear. No `cmdk` hint unless it opens the global palette.
- **Global search** in the top bar: `cmdk` variant that opens `CommandMenu`.
