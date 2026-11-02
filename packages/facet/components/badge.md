# Badge
> Source: https://vercel.com/geist/badge (captured 2026-11-02)

## Purpose
A short static label that marks status or category on the thing it sits next to.

## Anatomy
- Pill container (fully rounded, `whitespace-nowrap`, `tabular-nums`, `font-medium`).
- Optional leading `icon` slot (`data-slot=icon`).
- Text label.

## Variants & sizes
- `variant`: `gray`, `blue`, `purple`, `amber`, `red`, `pink`, `green`, `teal`, `inverted`, `trial` (blue→pink gradient), `turbo` (Turborepo brand). A separate `pill` variant is applied to a link through `badgeVariants({ variant: 'pill', size })`. It is a link styled like a badge.
- `contrast="low"`: the "-subtle" form of any color variant. Not shown for `inverted`, `trial` or `turbo`.
- `size`: `sm` | `md` | `lg`. `md` is used where no size is given (inferred from rendered default).

| size | height | padding-x | font | icon |
|---|---|---|---|---|
| `sm` | 20px | 8px | 11px / 20px, +0.2px tracking | 12px |
| `md` | 24px | 12px | 12px / 24px | 14px |
| `lg` | 32px | 12px | 14px | 16px |
(measured from rendered page)

Fill colors (measured, light theme):
- Solid: `gray` → `--ds-gray-900`; `blue` → `--ds-blue-800`; `red` → `--ds-red-900`; `green` → `--ds-green-900`; `teal` → `--ds-teal-900`; `purple` → `--ds-purple-900`; `pink` → `--ds-pink-900`. Text is the contrast foreground (white). Exception: `amber` → `--ds-amber-700` with black text. Dark theme switches to lighter steps (e.g. gray-500, red-800, green-600).
- Subtle (`contrast="low"`): a tint derived from the `-200` step of the color, with `-900` text (`gray-subtle` uses `--ds-gray-1000` text).
- `inverted`: `--ds-gray-1000` background, `--ds-gray-100` text.

## States
Static only. No hover, active or disabled states, by design.

## Tokens
`--ds-{color}-200` (subtle tint), `--ds-{color}-700/800/900` (solid fills), `--ds-{color}-900` (subtle text), `--ds-gray-1000` / `--ds-gray-100` (inverted), contrast foreground. Radius full. Text is close to `text-label-12` at md and `text-label-14` at lg (inferred). Rendered with `capitalize` (measured).

## Rules
- One badge per row. If you need two side by side, the row probably needs another column.
- Static only. Never put `onClick` on a Badge. If the value is actionable, use a Button or a link. Use the `pill` variant for clickable filter chips.
- Content is text, or `icon` + text. Never two icons, and never a nested badge.
- Title Case, one word ideally, two max (`Active`, `Pending`, `Enterprise Trial`). Use canonical terms (`Canceled`, with one L).
- Color carries the meaning. Do not add check or X icons. `green` = healthy, `red` = error, `amber` = warning, `blue` = informational, `gray` = neutral. Prefer the subtle form on dense surfaces.
- Do not put sentences in a badge (`Currently Active`).
- Lifecycle badges (`Alpha`, `Beta`) get a Tooltip that names the limit.
- Set `title` on icon-only or ambiguous badges. The text must be understandable without its color.
- Use `StatusDot` for a dot without text.

## Hidden Gems usage
- **Confidence tier** in the slate: `contrast="low"`, `size="sm"`. Map `green` = High, `amber` = Medium, `gray` = Low. Keep the label (`High`) so color is never the only signal.
- **Market type / book tags** (e.g. `Player Prop`, `Spread`): `gray` subtle. Never more than one badge per cell.
- **Signal freshness** for non-deployment states: Geist sends these to Badge, not StatusDot (`Stale` amber-subtle, `Live` green-subtle).
- **Injury / news flags** from the qualitative pipeline: `red` or `amber` subtle with a Tooltip carrying the source headline.
- Do not use solid fills in table cells. Keep solid badges for page-level emphasis (e.g. a `Beta` model badge in the header).
