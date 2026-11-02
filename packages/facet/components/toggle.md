# Toggle
> Source: https://vercel.com/geist/toggle (captured 2026-11-02)

## Purpose
An on/off control for a single boolean setting that takes effect as soon as it is flipped.

## Anatomy
- `<label>` wrapper with a visually hidden checkbox (`sr-only peer`).
- Track (pill, radius 14px) with a circular thumb that slides.
- Optional label (`children`) placed before or after (`direction`).
- Optional icons inside the thumb (`icon={{ checked, unchecked }}`).

## Variants & sizes
- `size`: default (small), `medium`, `large`. Measured track sizes: default 28×14px (thumb 11px), medium 36×20px, large 40×24px.
- `color`: e.g. `amber`, `red` (custom checked color).
- `direction`: default (label first, inferred) | `switch-first`.
- `labelCasing`: `title` (default) | `normal`.
- `checked` (required, controlled), `onChange`, `disabled`, `aria-label`.
- Colors (measured): unchecked track `--ds-gray-400`. Default checked color is the legacy `--geist-success`, which is **blue** (#0070f3). Thumb is `--ds-background-100` with a small shadow. Transition 150ms.

## States
Off, on, disabled-off, disabled-on, focus-visible (`--ds-focus-ring` ring on the track).

## Tokens
`--ds-gray-400` (track off), `--geist-success` (on; Facet equivalent `--ds-blue-700`, inferred), `--ds-background-100` (thumb), `--ds-focus-ring`. The rendered label is 12px medium in legacy `--geist-secondary` (measured).

## Rules
- Use for one immediate boolean. Use `Checkbox` for multi-select lists and `Switch` for 2–3 mutually exclusive views.
- Controlled only: own `checked` and update it in `onChange`.
- Persist on change and confirm with a success toast (`Password protection enabled`). Only add a Save footer if the setting really needs an explicit save.
- Only disable when the action is impossible, with helper text or a Tooltip naming the fix.
- The label comes from `children`. It is a Title Case noun phrase of 1–4 words describing the ON state (`Password Protection`, not `Enable …`). An optional one-sentence description below explains ON only.
- Needs an accessible name from `children`, `aria-label` or `aria-labelledby` (Geist warns in dev otherwise). Use `aria-label` only when the visible label sits elsewhere on the row.

## Hidden Gems usage
- Slate display settings: `Hide Stale Odds`, `Show Only Positive Edge`, `Auto-Refresh`. Default size keeps them compact in toolbars.
- `Auto-Refresh` takes effect immediately and confirms with a toast `Auto-refresh enabled`.
- Do not use Toggle to pick between books or markets (multi-valued). Use `FilterParams` or `MultiSelect`.
