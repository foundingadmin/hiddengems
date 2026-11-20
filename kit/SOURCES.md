# Sources and provenance

Captured 2026-11-02. When sources conflict, the higher row wins.

| Rank | Source | What we took | Where it lives |
|---|---|---|---|
| 1 | vercel.com production CSS, computed in Chromium (light and dark color schemes) | All 92 color primitives (sRGB), 70 Display P3 oklch overrides, 18 shadows, focus ring, motion, z-index, the 30 `.text-*` type roles, the 8 `.material-*` presets | `tokens/primitives.tokens.json`, `tokens/typography.tokens.json` |
| 1 | Live Geist component demos at vercel.com/geist/*, measured in Chromium | Control heights, padding, radii, colors for Button, Badge, Status Dot, Note, Input, Select, Tabs, Switch, Toggle, Table, Kbd, Progress, Skeleton | `css/components.css` ([G] marks) |
| 1 | `vercel.com/geist/<page>.md` (84 pages; Vercel publishes every docs page as Markdown) | Usage rules, variants, states, props | `foundations/`, `components/` (synthesized, with links) |
| 1 | `vercel.com/design.md` (Vercel's own agent skill for data-led report pages) and its report foundation stylesheet | Rules for evidence, tables, alignment, numeric treatment, color restraint, chart palette defaults, spacing ladder | `DESIGN.md`, `foundations/` |
| 2 | Vercel Web Interface Guidelines (vercel-labs/web-interface-guidelines, commit 434b7f9, 2026-10-05) | Interaction, animation, layout, content, forms, performance, accessibility rules | `guidelines/web-interface-guidelines.md` |
| 2 | `geist` npm package 1.9.0 (vercel/geist-font) | Variable WOFF2 fonts and the OFL license | `fonts/` |
| 2 | vercel-labs/agent-skills, official Vercel templates, Vercel docs | Engineering patterns, deployment guidance | Not shipped in the kit |
| 3 | Facet decisions | Semantic layer, data components ([F] marks), deviations table in `DESIGN.md` | `tokens/facet.semantic.json`, `patterns/` |
| 3 | The brand layer | Accent scale, gray tint, radii, shadows, modes and typeface for one project | `brand/brand.json`, `scripts/brand-core.mjs` |
| 4 | Third-party references | Ideas only, never authoritative | Not shipped in the kit |

## Not available publicly

- `@vercel/geistcn` (Geist React components) and `@vercel/geistcn-assets` (icons) are referenced in Vercel's docs but are not on public npm. Facet re-implements the components it needs in CSS from measurements.
- Four Geist docs pages returned 404 at capture time: icons, grid-system, geistcn-icons, terminal.

## Known inconsistencies inside Geist (recorded, not resolved by guessing)

- Prop naming varies: `variant` vs `type`, `small|medium|large` vs `sm|md|lg` vs numbers. Facet standardizes on `data-variant` and `data-size` with `small|medium|large` for controls and `sm|md|lg` for badges, matching the most common Geist usage per component.
- "Success" is blue in Note, Progress and Toggle (legacy `--geist-success`). See the deviations table in `DESIGN.md`.
- StatusDot and a few controls still paint with legacy `--geist-*` hex values. Facet maps them to current `--ds-*` steps.
- Gauge's color thresholds are not documented.

## What the kit leaves out

The raw captures (computed tokens, P3 values, component measurements) and the script that re-captures them stay with Facet's source. The token files here are their result.

## What the brand layer changes

`scripts/brand-core.mjs` generates the accent scale from one brand color on the captured lightness steps, and may tint the grays, scale the shadows and set the radii. A default build (`node scripts/brand.mjs reset`) leaves every captured color and shadow value as captured.
