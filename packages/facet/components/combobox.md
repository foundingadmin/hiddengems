# Combobox
> Source: https://vercel.com/geist/combobox (captured 2026-11-02)

## Purpose
A text input that filters a known list as the user types and lets them pick one option.

## Anatomy
- `Combobox` root (`aria-label`, `placeholder`, `value` / `onChange`, `width`, `size`, `clearable`, `disabled`, `errored`, `id`).
- `ComboboxInput`.
- `ComboboxList` (`emptyMessage`, `maxWidth`).
- `ComboboxOption` (`value`, `prefix`, `suffix`, `ignoreDefaultHeight` for multi-line rows).

## Variants & sizes
- `size`: `small` | default | `large`. Heights are not stated on the page. They presumably follow the 32/36/40 control scale (inferred).
- Uncontrolled or controlled, `clearable`, custom input `width` (e.g. 256), custom list `maxWidth` (e.g. 500), custom empty message, prefix or suffix icons per option, multi-line options.
- Inside `Modal`, it renders as a Dialog on mobile automatically.

## States
Default, open, filtered, empty (`emptyMessage`), disabled, errored, cleared. Async loading is required behavior (see Rules) but has no dedicated prop in the examples.

## Tokens
Input tokens (see input.md). Popover rows use `--ds-popover-row-height` 36px, row padding 0 8px, row radius 6px and list padding 6px (from captured computed tokens; inferred to apply). `--ds-shadow-menu` (inferred).

## Rules
- Use when users type to filter a known list. Use `Select` for short lists, `MultiSelect` for multiple values, and `Input` (search) for free-form filter strings.
- Keep the list open with a loading state while async results load.
- Empty-state copy: `No {items} match "{query}"`, never a bare `No results`.
- Inside a Modal, do not add a second portal. Trap focus in the popover.
- Arrow keys move through options. Do not make Enter submit the outer form while the list is open.
- Label is a short Title Case noun. Placeholder is a scoped hint (`Search regions`), never bare `Search…`.
- There is no `label` prop. Pair a `<Label htmlFor>` with the root `id`, or set `aria-label`. There is no `aria-labelledby` prop.
- When nested in a Modal, the list should not pop open on modal open (see modal.md "Combobox focus").

## Hidden Gems usage
- **Player / team lookup** to jump to a player's props: `size="small"`, `clearable`, options with a team logo `prefix` and position `suffix`.
- Empty copy: `No players match "kelce"`.
- Use `ignoreDefaultHeight` for two-line options (player name + `KC · TE · vs LV`).
