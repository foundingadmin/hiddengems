# Color

> Source: https://vercel.com/geist/colors and vercel.com production CSS, computed in Chromium on 2026-11-02 (`reference/geist-computed-2026-11-02.json`, `reference/geist-p3-oklch-2026-11-02.json`).

## The system

Geist has 10 scales: `background`, `gray`, `gray-alpha`, `blue`, `red`, `amber`, `green`, `teal`, `purple`, `pink`. Every scale except background has 10 steps, and **the step number is the job**, not the lightness:

| Step | Job | Example |
|---|---|---|
| 100 | Default component background | Badge low contrast fill, hover row |
| 200 | Hover background | Hovered fill, low contrast badge |
| 300 | Active background | Pressed, selected |
| 400 | Default border | Dividers, input ring |
| 500 | Hover border | |
| 600 | Active border | |
| 700 | High contrast background | Solid status fills, dots, chart marks |
| 800 | Hover high contrast background | Error button fill |
| 900 | Secondary text and icons | Labels, metadata, colored text |
| 1000 | Primary text and icons | Body, values |

Because dark mode redefines every step, a component written as "border uses 400, text uses 900" is automatically correct in both themes. Never pick a step by how it looks in one theme.

Backgrounds: Background 1 (`--ds-background-100`, white / #0a0a0a) for nearly everything; Background 2 (`--ds-background-200`, #fafafa / #000) sparingly for subtle separation (sidebars, wells, striped rows).

## Rules from Geist

- **Gray** for text, icons, fills, borders and dividers by default. **Gray-alpha** only when the background must show through (overlays, shadows, an edge on a tinted surface).
- **Draw each border once.** Overlapping alpha borders darken at intersections.
- **Keep material shadows translucent.** Opaque shadows leave a halo.
- On a Background 1 component, hover is gray-100 and active is gray-200. Small elements like badges can sit on 200 or 300.
- Wide gamut: on Display P3 screens the colored scales upgrade to oklch values (grays are neutral and do not change). This is automatic in `tokens.css`.

## Quirks worth knowing (observed, not documented)

- Light gray-400 equals gray-200 (`#ebebeb`). Borders are deliberately whisper-light in light mode; contrast comes from type, not lines.
- Dark gray-700 and gray-800 equal their light values (`#8f8f8f`, `#7d7d7d`). Mid steps are shared across themes; the ends flip.
- Solid badges use the 900 step for most hues, blue uses 800, and amber uses 700 with black text (measured on the live Badge component).
- The legacy Geist StatusDot still paints with older brand hex values (`#50e3c2`, `#f5a623`, `#e00`). Facet maps dots to the current scales instead.

## Hue allocation

Each hue has exactly one job. This is a hard rule, enforced by `scripts/lint-color.mjs`; the full table lives in [`DESIGN.md`](../DESIGN.md#hue-allocation-hard-rule-f) and at the top of the color section in `preview/index.html`. Purple is reserved for gems only.

## Facet semantic layer `[F]`

Product code reads semantic names first (`--fc-*`), primitives second (`--ds-*`), raw values never. Full list in `tokens/facet.semantic.json`.

| Group | Tokens | Maps to |
|---|---|---|
| Text | primary, secondary, disabled, inverse, link | gray-1000, gray-900, gray-700, background-100, blue-900 |
| Surface | canvas, subtle, fill, fill-hover, fill-active, contrast | background-100, background-200, gray-100/200/300, gray-1000 |
| Border | default, hover, active, alpha | gray-400/500/600, gray-alpha-400 |
| Status | info, success, warning, error, neutral × fg/solid/bg/border | blue, green, amber, red, gray at 900/700/200/400 |
| Signal | go, wait, stop, none × fg/solid/bg | green, amber, red, gray |
| Edge | positive, negative, neutral | green-900, red-900, gray-900 |
| Gem | fg, solid, bg, border, tier.rough/cut/polished/flawless | purple, tiers gray-700 then purple 600/700/900 |
| Freshness | live, recent, stale, failed, unknown | green-700, blue-700, amber-700, red-700, gray-600 |
| Chart | 1 to 6, muted, grid, axis | gray-1000, blue-700, teal-700, pink-700, gray-700, gray-500; gray-600/300/500 |

### Contrast rules

- Readable text uses step 900 or 1000 only. Steps 700 and below are for fills, marks and disabled text.
- Colored text (verdict words, edge numbers) uses the 900 step of its hue.
- Never encode meaning with color alone: pair with a word, sign, arrow, glyph count or position.

### Chart color

Vercel's own report foundation maps all six chart slots to grays. Facet keeps `chart-1` as gray-1000 and adds blue, teal and pink in a fixed order only when series must be distinguished and direct labels are not enough. Verdict hues (green, amber, red) and purple are never series colors, so a chart can't be misread as a verdict or a gem. A series keeps its slot across every view. A gradient is allowed only as a labelled continuous scale.
