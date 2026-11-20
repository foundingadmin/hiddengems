# Sources and provenance

Captured 2026-11-02. When sources conflict, the higher row wins.

| Rank | Source | What we took | Where it lives |
|---|---|---|---|
| 1 | vercel.com production CSS, computed in Chromium (light and dark color schemes) via `scripts/sync-primitives.mjs` | All 92 color primitives (sRGB), 70 Display P3 oklch overrides, 18 shadows, focus ring, motion, z-index, the 30 `.text-*` type roles, the 8 `.material-*` presets | `tokens/primitives.tokens.json`, `tokens/typography.tokens.json`, `reference/geist-computed-2026-11-02.json`, `reference/geist-p3-oklch-2026-11-02.json` |
| 1 | Live Geist component demos at vercel.com/geist/*, measured in Chromium | Control heights, padding, radii, colors for Button, Badge, Status Dot, Note, Input, Select, Tabs, Switch, Toggle, Table, Kbd, Progress, Skeleton | `css/components.css` ([G] marks), `reference/geist-component-measurements-*.json` |
| 1 | `vercel.com/geist/<page>.md` (84 pages; Vercel publishes every docs page as Markdown) | Usage rules, variants, states, props | `foundations/`, `components/` (synthesized, with links) |
| 1 | `vercel.com/design.md` (Vercel's own agent skill for data-led report pages) and its report foundation stylesheet | Rules for evidence, tables, alignment, numeric treatment, color restraint, chart palette defaults, spacing ladder | `DESIGN.md`, `foundations/` |
| 2 | Vercel Web Interface Guidelines (vercel-labs/web-interface-guidelines, commit 434b7f9, 2026-10-05) | Interaction, animation, layout, content, forms, performance, accessibility rules | `guidelines/web-interface-guidelines.md` |
| 2 | `geist` npm package 1.9.0 (vercel/geist-font) | Variable WOFF2 fonts and the OFL license | `fonts/` |
| 2 | vercel-labs/agent-skills, official Vercel templates, Vercel docs | Engineering patterns, deployment guidance | `reference/vercel-ecosystem.md`, `/docs/vercel-deployment.md` |
| 2 | NFL Colors (Community), Figma file 9yagbCQHhA5KU1tCP0ncF7, read through the Figma MCP | 32 team color sets and logos (full-color tiles and silhouettes), by division | `kits/nfl/teams.json`, `kits/nfl/logos/` |
| 3 | Facet decisions | Semantic layer, Hidden Gems components ([F] marks), deviations table in `DESIGN.md` | `tokens/facet.semantic.json`, `patterns/` |
| 4 | Third-party jumpstarts, screenshots, inspiration | Ideas only, never authoritative | `reference/inbox/` |

## Not available publicly

- `@vercel/geistcn` (Geist React components) and `@vercel/geistcn-assets` (icons) are referenced in Vercel's docs but are not on public npm. Facet re-implements the components it needs in CSS from measurements.
- Four Geist docs pages returned 404 at capture time: icons, grid-system, geistcn-icons, terminal.

## Known inconsistencies inside Geist (recorded, not resolved by guessing)

- Prop naming varies: `variant` vs `type`, `small|medium|large` vs `sm|md|lg` vs numbers. Facet standardizes on `data-variant` and `data-size` with `small|medium|large` for controls and `sm|md|lg` for badges, matching the most common Geist usage per component.
- "Success" is blue in Note, Progress and Toggle (legacy `--geist-success`). See the deviations table in `DESIGN.md`.
- StatusDot and a few controls still paint with legacy `--geist-*` hex values. Facet maps them to current `--ds-*` steps.
- Gauge's color thresholds are not documented.

## Re-sync

`node scripts/sync-primitives.mjs` re-captures everything in rank 1 that is machine-readable and rewrites the primitive token files. It was verified to reproduce the committed color and shadow tokens exactly on 2026-11-02.
