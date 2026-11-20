# Context Menu
> Source: https://vercel.com/geist/context-menu (captured 2026-11-02)

## Purpose
A menu of contextual actions opened by right-click or long-press on a target area.

## Anatomy
- `ContextMenu` > `ContextMenuTrigger` (the area) + `ContextMenuContent` > `ContextMenuItem` (`onClick` or `href`, `value`, `disabled`, `prefix`, `suffix`).

## Variants & sizes
Action items, link items, disabled items, prefix or suffix icons. No size prop.

## States
Closed, open at the pointer, item hover/disabled.

## Tokens
Same material as Menu (inferred): `--ds-shadow-menu`, 12px radius, popover row tokens. The demo trigger uses a dashed `--ds-gray-alpha-600` border, which is demo-only.

## Rules
- A power-user shortcut only. **Never the only way** to reach an action. Mirror every item in a visible Menu or row button.
- Right-click on desktop, long-press on touch. Suppress the native browser menu only inside the trigger area.
- Open at the pointer. Flip horizontally, then vertically, rather than clipping.
- Close on activation, Escape and outside click.
- Items follow Menu copy rules (sentence case `Verb + noun`, `…` for follow-up dialogs, destructive last after a divider).
- Keyboard: Shift+F10 or the menu key opens it. Arrows, Enter/Space, Escape. No nested submenus for destructive items.

## In practice
- Right-click a board row for the same actions as the row dots menu (Watch, Copy, Open in CRM, Hide). It must exactly mirror the dots `Menu`.
- Right-click a value cell for `Copy value`, `Open this source`.
- Useful for power users, not a launch requirement.
