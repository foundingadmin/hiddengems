# Keyboard Input
> Source: https://vercel.com/geist/keyboard-input (captured 2026-11-02)

## Purpose
Shows a keyboard key or shortcut (`Kbd`).

## Anatomy
- `<kbd>` box: background `--ds-background-100`, 1px ring `--ds-gray-alpha-400`, small radius, sans font. Modifier glyphs are rendered from boolean props. `children` is one key.

## Variants & sizes
- Modifiers: `meta`, `shift`, `alt`, `ctrl`, combinable (`<Kbd meta shift/>`). `⌘` changes to `Ctrl` on Windows and Linux.
- `small`. Measured: default is min-height 24px, min-width 24px (`--geist-gap`), 6px x-padding, 14px text, `--ds-gray-1000`. Small is 20px high, 20px min-width, 4px x-padding, 12px text.

## States
Static.

## Tokens
`--ds-background-100`, `--ds-gray-alpha-400`, `--ds-gray-1000` (`--ds-gray-900` in some contexts, measured).

## Rules
- Use in prose, menu items and button suffixes. In long docs, write `the ⌘ K shortcut` as plain text.
- Use boolean modifier props, never `Cmd+K` text.
- `children` is one key (`K`, `Enter`, `Esc`). Do not lowercase it and do not write sentences.
- Use `small` in dense surfaces (menu rows, command items, table cells).
- Keep punctuation outside the element.

## Hidden Gems usage
- Shortcut hints in Tooltips and Menu items: `J`/`K` to move between rows, `T` to track, `O` to open the book, `/` to focus search, `⌘ K` for the palette. Use `small` in menus and the table toolbar.
