# Spinner
> Source: https://vercel.com/geist/spinner (captured 2026-11-02)

## Purpose
A rotating indicator for loading triggered by a user action (button, pagination, row retry).

## Anatomy
- Single spinning glyph that inherits `currentColor` (colored with `text-*` classes).

## Variants & sizes
- `size`: `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`, `4xl`. Pixel values are **not specified by the reference**. Button renders a 16px spinner at small size (measured on button page).
- Color via class (`text-red-700`, `text-green-700`, `text-blue-700`). Default color not specified.

## States
Spinning.

## Tokens
`currentColor`. Demos use `--ds-red-700`, `--ds-green-700`, `--ds-blue-700`.

## Rules
- Use for indeterminate single-action waits of about 1–3s. Use Button `loading` for buttons, Skeleton for layout, LoadingDots for text and Progress for known totals.
- Mount only once the action starts. Do not pre-render and toggle visibility.
- Add copy naming the work for waits over ~1s (`Verifying…`).
- Match the size to nearby type or icon, not the container.
- Set `aria-busy="true"` on the wrapper. Keep the trigger focusable. Respect reduced motion.

## Facet CSS
```html
<button class="fc-button" data-variant="tertiary" data-size="small" aria-busy="true">
  <span class="fc-spinner" aria-hidden="true"></span>Pulling
</button>
<span class="fc-status" aria-busy="true"><span class="fc-spinner" data-size="small" aria-hidden="true"></span>Running</span>
```
`.fc-spinner` is 16px (12px with `data-size="small"`), drawn in `currentColor`, slowed under reduced motion. CSS in `css/components.css`.

## Hidden Gems usage
- Data health: the `Pull now` and `Pull everything` buttons while a pull runs, and the row's status cell (`Running`).
- Row-level `Retry` when one book's price fetch fails. Inline spinner in the price cell at `sm`.
- `Load more` in long lists (use LoadMoreButton's `loading`).
