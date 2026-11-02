# Tooltip
> Source: https://vercel.com/geist/tooltip (captured 2026-11-02)

## Purpose
A small floating label shown on hover or keyboard focus. It explains why something exists or what limits apply.

## Anatomy
- Trigger (any element: span, Button, Badge, Spinner).
- Floating box with optional triangular tip (stem). Per the reference materials, tooltips are the only floating element with a stem.
- `text` (string or JSX, including `Kbd`).

## Variants & sizes
- `position`: `top` (default) | `bottom` | `left` | `right`.
- `boxAlign`: `left` | center (default) | `right` (alignment against the trigger).
- `delay={false}`: opens immediately. The default entry delay is about 150ms.
- `type`: default | `success` | `error` | `warning` | `violet`.
- `tip={false}`: hides the stem. `center={false}`: left-aligns multi-line text.
- `desktopOnly` (used in switch.md examples).
- No size prop.

## States
Hidden, shown (hover or focus), closed with Escape (focus returns to trigger).

## Tokens
`material-tooltip`: 6px corner, lightest floating shadow `--ds-shadow-tooltip`. Popover motion `--ds-motion-popover-duration` .2s and `--ds-motion-popover-timing`. `--ds-z-tooltip` 99999 (from captured computed tokens). Colored types are inferred to use red/amber/purple 700-step fills, based on the button CSS's tooltip rules for error (red-700) and warning (amber-700).

## Rules
- Explain why, not what. The visible label names the thing, and the tooltip adds constraint, scope or limit.
- Use `ContextCard` for entity previews with metadata. Use Drawer or a page for long content.
- Lifecycle tooltips follow `{Label}: {meaning}. {Specific limit}.` (e.g. `Alpha: API may change before GA`).
- Keep the ~150ms delay. Opens on hover and focus.
- Never wrap a labelled Input in a Tooltip. Never hide primary actions inside one, because touch users cannot reach them.
- One sentence or fragment, sentence case, no period on a fragment. Do not repeat the label or describe the interaction (`Click to…`).
- Icon-only triggers still need an `aria-label`. Escape closes.

## Hidden Gems usage
- **Disabled reasons**: `Market suspended at caesars.`
- **Metric definitions** on column headers: `Edge: model probability minus implied probability.`
- **Badge explanations**: `High confidence: 4 of 5 signals agree.`
- **Full values** for MiddleTruncated prop names, unless you use copy-on-click instead.
- Add `Kbd` in text for shortcuts (`Track bet T`).
- For richer hover content (line history mini-table, book list) use ContextCard, not Tooltip.

## Dotted underline rule `[F]`

Owner decision, 2026-11-02. A dotted underline (`.fc-has-tip`) always means a helper sits behind the text, and nothing else uses it. It replaces info icons, so labels and headers stay short.

- The helper opens on hover (250ms delay), keyboard focus and tap. `js/tips.mjs` (`mountTips()`) wires every trigger and makes it focusable.
- Point `aria-describedby` at a `.fc-tooltip.fc-float` popover, or give the trigger `data-tip="..."` and the tooltip is created.
- Escape, a tap elsewhere or scrolling closes it. A rich helper (the relative time card) uses the same trigger.
- The helper adds information and never restates the text it sits behind.
