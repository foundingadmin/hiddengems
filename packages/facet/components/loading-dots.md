# Loading Dots
> Source: https://vercel.com/geist/loading-dots (captured 2026-11-02)

## Purpose
Three animated dots that show background work in progress, usually inline with text.

## Anatomy
- Dot sequence, optionally with `children` text before it.

## Variants & sizes
- `size`: the example uses `sm` | `md` | `lg`, but the best-practice prose says `size` is a number (dot diameter in px). Pixel values are **not specified by the reference**. See contradiction note.

## States
Animating only.

## Tokens
Not specified. Inherits text color (inferred). Demo label is `text-copy-14 text-gray-900`.

## Rules
- Use inline in text for short waits (`Saving<LoadingDots/>`). Use `loading` for buttons, Skeleton for layout and Progress for known totals. Use Spinner for icon-size waits.
- Only override size when the default does not match the nearby type.
- The label names the work (`Saving`, `Deploying`). Never use it after a past-tense verb (`Saved…`).
- Wrapper has `aria-live="polite"`. Dots are decorative (no `aria-label`). Respect reduced motion and never pair with another animation on the same line.

## Hidden Gems usage
- `Refreshing odds…` in the toolbar status area during auto-refresh.
- `Scoring…` next to a recalculating market in the Sheet header.
