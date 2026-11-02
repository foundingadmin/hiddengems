# Guide marker

> Facet component `[F]`. For documentation and guidelines, never product UI.

## Purpose
Labels an example or rule as correct ("Do", "Use for") or incorrect ("Don't", "Never for").

## Anatomy
A 14px icon (a check or a cross in a circle) plus a word. Markup: `<span class="fc-guide" data-guide="do">Do</span>` or `data-guide="dont"`.

## Variants
- **Neutral (default):** gray icon and gray-900 text. The icon's shape and the word carry the meaning, so it works without color.
- **Critical (`data-critical`):** green check (`--fc-status-success-*`) or red cross (`--fc-status-error-*`).

## Rules
- Neutral is the default everywhere.
- Use critical only on hard-rule guidance, where misuse breaks the system: the hue allocation, color as the only cue. Most pages should have none.
- If critical markers appear in more than one section of a page, they have stopped meaning anything; demote some to neutral.
- Never use the verdict signal (`.fc-signal`) for documentation. Go, wait and stop are product language.
- A Don't keeps its reason; a Do speaks for itself.

**The Content guide uses critical markers** (owner decision, 2026-11-02). Its whole subject is right and wrong writing, and each lesson shows the Don't and Do markers once, as column headers, so the green and red stay rare enough to mean something.
