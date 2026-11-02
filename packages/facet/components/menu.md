# Menu
> Source: https://vercel.com/geist/menu (captured 2026-11-02)

## Purpose
A dropdown list of actions opened from a visible button, with typeahead and full keyboard navigation.

## Anatomy
- `MenuContainer` (`position`, e.g. `left-start`).
- `MenuButton`: extends Button (`variant`, `size`, `shape`, `svgOnly`, `showChevron`, or `type="unstyled"` for custom triggers such as an Avatar).
- `Menu` (`width`, e.g. 200).
- Items: `MenuItem` (`onClick`, `href`, `type="error"`, `disabled`, `prefix`, `suffix`), `MenuItemLocked` (disabled with a lock icon suffix, for permission gating), `MenuLink`, `MenuSection` (`title`), `MenuDivider`.

## Variants & sizes
- Trigger sizes follow Button. The menu panel has no size prop. `width` is set in px.
- Position auto-flips to stay inside the window bounds.

## States
Closed, open. Item hover/highlight, disabled, locked, destructive (`type="error"`).

## Tokens
`material-menu`: radius 12px, `--ds-shadow-menu`. `--ds-popover-padding` 6px, `--ds-popover-row-height` 36px, `--ds-popover-row-padding` 0 8px, `--ds-popover-row-radius` 6px, `--ds-z-menu` 2001, popover motion .2s with `--ds-motion-timing-swift` (from captured computed tokens; row tokens inferred to apply to Menu). Item text likely `text-label-14` (inferred from typography page: "Most common text style… used in many menus").

## Rules
- Use for actions on a single resource behind a visible trigger (a row's dots menu, an entity dropdown). Use `ContextMenu` for right-click, `CommandMenu` for global ⌘K, and SplitButton for two related primary actions.
- About 10 items max. Group with `MenuSection` beyond that.
- Open on click, never hover. Close on activation, Escape and outside click, but not on hover-out.
- Use `MenuItemLocked` for permission-gated actions, ideally wrapped in a Tooltip naming why.
- Items are Title Case `Verb + Noun`. Add `…` only when the item opens a follow-up dialog. Destructive items go last after a divider and are never a bare `Delete`.
- Section titles are Title Case, 1–2 words.
- Up/Down, Home/End, Enter/Space, typeahead on the first letter of the visible label. Return focus to the trigger on close.

## Hidden Gems usage
- **Row overflow (dots) menu** on each slate row: `Track Bet`, `Copy Bet Details`, `Open in Sportsbook`, `View Line History`, divider, `Hide Market`.
- **Column visibility** menu in the table toolbar (`MenuButton showChevron variant="secondary" size="small"` labelled `Columns`).
- Use `MenuItemLocked` for features gated by plan, if any.
