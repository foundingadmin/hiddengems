# Skeleton
> Source: https://vercel.com/geist/skeleton (captured 2026-11-02)

## Purpose
A shimmering placeholder that takes the shape of content still loading.

## Anatomy
- Block element with a moving gradient. It can wrap children (hidden until loaded) or stand alone at a fixed size.

## Variants & sizes
- `width`, `height` (number or %), `boxHeight` (outer box height vs bar height).
- Wrapping children: auto-sized to the child. With fixed size, it hides once children are non-null but keeps its size. `show={false}` reveals children.
- Shape: default radius **5px** (measured), `pill` (fully round), `rounded`, `squared` (no radius).
- `animated={false}`. `button` (extends the animation by 1px to match button edges).
- Default standalone min-height 24px (measured, `width=160` demo).

## States
Animated, static, revealed.

## Tokens
Shimmer gradient `--ds-gray-100` → `--ds-gray-200` → `--ds-gray-100` (measured).

## Rules
- Use for async data with a known layout (table rows, cards). Use Spinner for single actions, LoadingDots for inline text and Progress for known totals.
- Never decorative and never an empty state. With no data, render EmptyState.
- Match final dimensions so nothing shifts on load. Mirror the final shape: pill for avatars, rounded for buttons and chips, squared for image tiles.
- Set `aria-busy="true"` on the loading region and `aria-live="polite"` on the destination. Respect `prefers-reduced-motion` (`animated={false}`). No focusable controls inside.

## Hidden Gems usage
- **Slate loading**: 10–15 skeleton rows sized to the real columns (e.g. market 60% width, odds 48px, score pill 13px circle).
- **Gauge loading** in the Sheet: `pill` skeleton at gauge size (64px), or Gauge `indeterminate` if a value is coming.
- **Entity skeleton** variant for signals and news lists.
- Turn off animation on the auto-refresh cycle. Re-skeletoning every refresh is distracting. Keep stale data visible with a freshness indicator instead.
