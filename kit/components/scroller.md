# Scroller
> Source: https://vercel.com/geist/scroller (captured 2026-11-02)

## Purpose
A container for content that overflows along one axis (or both), with optional scroll buttons.

## Anatomy
- `Scroller` (`height`, `width`, `overflow`, `withButtons`, `childrenContainerClassName`) wrapping direct children.

## Variants & sizes
- `overflow`: `y` (vertical), `x` (horizontal), `both` (free).
- `withButtons`: buttons scroll to the next **direct** child.
- `height` / `width`: number (px) or string.

## States
Scrolled to start, middle or end. Buttons shown with `withButtons`.

## Tokens
Not specified by the reference.

## Rules
- Use for overflowing peer items on one axis (chip rows, log streams). Use `both` only when content really scrolls both ways.
- Virtualize inside the Scroller for datasets beyond a few hundred items.
- Buttons only target direct children. Do not wrap items in extra nodes.
- Show edge fades or shadows on clipped edges. Keep item widths and gaps consistent.
- Tab order follows the DOM. Scroll buttons need descriptive `aria-label`s (`Scroll games left`). Focusing an off-screen item must scroll it into view.

## Hidden Gems usage
- **Game strip** above the slate: horizontal scroller of game chips (`KC @ LV · 4:25 PM`) with buttons.
- **News feed** panel: vertical scroller with fixed height.
