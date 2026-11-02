# JSON View
> Source: https://vercel.com/geist/json-view (captured 2026-11-02)

## Purpose
Shows JSON objects and arrays as a collapsible, syntax-colored, keyboard-navigable tree with selectable text and search highlighting.

## Anatomy
- `JsonView` (`data`, `defaultExpandDepth`, `highlightPattern`). Helper `makeJsonViewHighlightPattern(terms)`.

## Variants & sizes
- `defaultExpandDepth`: expands levels strictly below this depth (`0` = all collapsed, `1` = top level open).
- Short single-pair objects render on one line. Long primitives wrap. Embedded mode flows inline with surrounding text (demo wraps in `font-mono text-copy-13`).

## States
Collapsed or expanded nodes, highlighted matches, focused node.

## Tokens
Not specified. Demo context uses `text-copy-13` mono.

## Rules
- Use when users inspect, collapse, select or copy structured JSON. Use a code block for static documentation.
- `defaultExpandDepth={1}` for logs and details. `0` for dense tables and compact previews.
- Pass `highlightPattern` only while searching (otherwise `null`). Pass objects, never pre-stringified JSON.
- Tree semantics: arrows move, Enter/Space toggles, Home/End jump. The tree's accessible label is `JSON`, so give it surrounding context. Keep text selectable.

## Hidden Gems usage
- P1. **Raw model inputs / signal payload** inside a Collapse in the bet Sheet (`defaultExpandDepth={1}`), for power users and debugging.
- Highlight matching keys when the user searches within signals.
