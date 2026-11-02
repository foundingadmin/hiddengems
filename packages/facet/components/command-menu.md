# Command Menu
> Source: https://vercel.com/geist/command-menu (captured 2026-11-02)

## Purpose
A full-screen, keyboard-first command palette for finding resources and running actions anywhere in the app.

## Anatomy
- `CommandMenu` (`open`, `setOpen`) > `CommandMenuInput` (`placeholder`) + `CommandMenuList` > `CommandMenuGroup` (`heading`) > `CommandMenuItem` (`callback`, `suffix`, `keybind`), with `CommandMenuDivider`. Pages via `CommandMenuPage` (`label`, `placeholder`) are mentioned in best practices.

## Variants & sizes
Grouped list, divider-separated list, items with suffix (text or icon). No size prop.

## States
Closed, open (root page), filtering, sub-page, empty input (should show recents or defaults).

## Tokens
Overlay material is inferred as `material-modal` / `--ds-shadow-modal`, radius 12px, overlay backdrop `--ds-overlay-backdrop-color` at `.8` opacity, overlay motion .3s with scale .96 (from captured computed tokens). Suffix text in the demo is `text-copy-14 text-gray-700`.

## Rules
- Global and keyboard-first. Use Menu for single-resource dropdowns and ContextMenu for right-click.
- Bind ⌘K (mac) / Ctrl+K elsewhere, and never reuse it for an in-page filter.
- Open at the root page and keep the query when navigating back from a sub-page.
- Trap focus while open and return focus on close. Show recent or default items when the input is empty.
- Split into pages past about 30 items or several resource types.
- Items are sentence case verb phrases that act (`Deploy project`), not navigation phrasing (`Go to…`).
- Page labels are sentence case. Page placeholders are sentence case, scoped, and end with `…` (`Search projects…`). Group headings are 1–2 words.
- `aria-live="polite"` on the result count. Up/Down, Enter, Escape. Backspace on empty input pops a page. Show keybinds with `Kbd`.

## Hidden Gems usage
- P1. ⌘K palette: `Find player…`, `Jump to game…`, `Track bet…`, `Toggle auto-Refresh`, `Switch odds format`.
- Pages: `Players`, `Games`, `Saved filters`. Placeholder `Search players…`.
- Empty state shows recently viewed players and markets.
