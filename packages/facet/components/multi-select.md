# Multi Select
> Source: https://vercel.com/geist/multi-select (captured 2026-11-02)

## Purpose
A keyboard-friendly dropdown for checking several values from a known list, with quick "only this" and "select all" actions.

## Anatomy
- `MultiSelectRoot`.
- `MultiSelectTrigger`: a button whose text summarizes the selection.
- `MultiSelectContent` (`align="start"`).
- `MultiSelectRow`: `name`, `checked`, `onChange`, `onSelectOnly`, `onSelectAll`, `selectedCount`, `totalCount`. Each row has a checkbox plus an action button whose label changes with context (Select Only / Select All / toggle) and appears on hover or focus.

## Variants & sizes
- Controlled selection (a `Set` in the examples). No size or variant props documented.

## States
Row checked or unchecked. Hover or focus reveals the action label. Checkbox focus vs action-button focus. Open or closed.

## Tokens
Not specified by the reference. Inferred: popover material (`--ds-shadow-menu`, 12px radius), `--ds-popover-row-height` 36px, Checkbox tokens.

## Rules
- Use for picking several values from a known list. Use `Select` for one value, `Combobox` when filtering matters more, and `Toggle` for booleans.
- The trigger shows a count (`3 regions selected`), or the single name when only one is picked. It needs a stable accessible name even with nothing selected.
- Use controlled mode when state lives in the URL or on the server.
- Keyboard: Up/Down between rows, Left/Right between a row's checkbox and its action button, Enter/Space activates, Tab leaves.
- Empty filter copy: `No {items} match "{query}"`.
- Each row's checkbox needs an `aria-label` (`Select us-east-1`). Trap focus while open and return focus to the trigger on close.

## Hidden Gems usage
- **Sportsbooks**: `5 books selected`. `Select Only` is ideal for "show me only DraftKings".
- **Markets**: Passing Yards, Receptions, Anytime TD…
- **Teams / games** on the slate.
- When used as filters, prefer FilterParams `type: 'multi-select'` so state is URL-backed. Use standalone MultiSelect for settings such as "books I have accounts at".
